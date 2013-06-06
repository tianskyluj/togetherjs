/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
define(["jquery", "util", "peers", "session"], function ($, util, peers, session) {
  var assert = util.assert;
  var windowing = util.Module("windowing");
  var $window = $(window);
  // This is also in towtruck.less, under .towtruck-animated
  var ANIMATION_DURATION = 1000;

  /* Displays one window.  A window must already exist.  This hides other windows, and
     positions the window according to its data-bound-to attributes */
  windowing.show = function (element, options) {
    element = $(element);
    options = options || {};
    options.bind = options.bind || element.attr("data-bind-to");
    if (options.bind) {
      options.bind = $(options.bind);
    }
    windowing.hide();
    element.show();
    if (options.bind) {
      assert(! element.hasClass("towtruck-modal"), "Binding does not currently work with modals");
      bind(element, options.bind);
    }
    if (element.hasClass("towtruck-modal")) {
      getModalBackground().show();
      modalEscape.bind();
    }
    onClose = options.onClose || null;
    session.emit("display-window", element.attr("id"), element);
  };

  var onClose = null;

  /* Moves a window to be attached to data-bind-to, e.g., the button
     that opened the window. Or you can provide an element that it should bind to. */
  function bind(win, bound) {
    win = $(win);
    assert(bound.length, "Cannot find binding:", bound.selector, "from:", win.selector);
    // FIXME: hardcoding
    var ifacePos = "right";
    //var ifacePos = panelPosition();
    var boundPos = bound.offset();
    boundPos.height = bound.height();
    boundPos.width = bound.width();
    var windowHeight = $window.height();
    var windowWidth = $window.width();
    boundPos.top -= $window.scrollTop();
    boundPos.left -= $window.scrollLeft();
    // FIXME: I appear to have to add the padding to the width to get a "true"
    // width.  But it's still not entirely consistent.
    var height = win.height() + 5;
    var width = win.width() + 20;
    var left, top;
    if (ifacePos == "right") {
      left = boundPos.left - 11 - width;
      top = boundPos.top + (boundPos.height / 2) - (height / 2);
    } else if (ifacePos == "left") {
      left = boundPos.left + boundPos.width + 15;
      top = boundPos.top + (boundPos.height / 2) - (height / 2);
    } else if (ifacePos == "bottom") {
      left = (boundPos.left + boundPos.width / 2) - (width / 2);
      top = boundPos.top - 10 - height;
    }
    top = Math.min(windowHeight - 10 - height, Math.max(10, top));
    win.css({
      top: top + "px",
      left: left + "px"
    });
    if (win.hasClass("towtruck-window")) {
      $("#towtruck-window-pointer-right, #towtruck-window-pointer-left").hide();
      var pointer = $("#towtruck-window-pointer-" + ifacePos);
      pointer.show();
      if (ifacePos == "right") {
        pointer.css({
          top: boundPos.top + Math.floor(boundPos.height / 2) + "px",
          left: left + win.width() + 9 + "px"
        });
      } else if (ifacePos == "left") {
        pointer.css({
          top: boundPos.top + Math.floor(boundPos.height / 2) + "px",
          left: (left - 5) + "px"
        });
      } else {
        console.warn("don't know how to deal with position:", ifacePos);
      }
    }
    win.data("boundTo", bound.selector || "#" + bound.attr("id"));
    bound.addClass("towtruck-active");
  }

  session.on("resize", function () {
    var win = $(".towtruck-modal:visible, .towtruck-window:visible");
    if (! win.length) {
      return;
    }
    var boundTo = win.data("boundTo");
    if (! boundTo) {
      return;
    }
    boundTo = $(boundTo);
    bind(win, boundTo);
  });

  windowing.hide = function (els) {
    // FIXME: also hide modals?
    els = els || ".towtruck-window, .towtruck-modal";
    els = $(els);
    els = els.filter(":visible");
    els.hide();
    getModalBackground().hide();
    var windows = [];
    els.each(function (index, element) {
      element = $(element);
      var bound = element.data("boundTo");
      if (! bound) {
        return;
      }
      bound = $(bound);
      bound.addClass("towtruck-animated").addClass("towtruck-color-pulse");
      setTimeout(function () {
        bound.removeClass("towtruck-color-pulse").removeClass("towtruck-animated");
      }, ANIMATION_DURATION+10);
      element.data("boundTo", null);
      bound.removeClass("towtruck-active");
      windows.push(element);
    });
    $("#towtruck-window-pointer-right, #towtruck-window-pointer-left").hide();
    if (onClose) {
      onClose();
      onClose = null;
    }
    if (windows.length) {
      session.emit("hide-window", windows);
    }
  };

  windowing.showNotification = function (element, options) {
    element = $(element);
    options = options || {};
    assert(false);
  };

  windowing.toggle = function (el) {
    el = $(el);
    if (el.is(":visible")) {
      windowing.hide(el);
    } else {
      windowing.show(el);
    }
  };

  function bindEvents(el) {
    el.find(".towtruck-close, .towtruck-dismiss").click(function (event) {
      var w = $(event.target).closest(".towtruck-window, .towtruck-modal, .towtruck-notification");
      windowing.hide(w);
      event.stopPropagation();
      return false;
    });
  }

  function getModalBackground() {
    if (getModalBackground.element) {
      return getModalBackground.element;
    }
    var background = $("#towtruck-modal-background");
    assert(background.length);
    getModalBackground.element = background;
    background.click(function () {
      windowing.hide();
    });
    return background;
  }

  var modalEscape = {
    bind: function () {
      $(document).keydown(modalEscape.onKeydown);
    },
    unbind: function () {
      $(document).unbind("keydown", modalEscape.onKeydown);
    },
    onKeydown: function (event) {
      if (event.which == 27) {
        windowing.hide();
      }
    }
  };

  session.on("close", function () {
    modalEscape.unbind();
  });

  session.on("new-element", function (el) {
    bindEvents(el);
  });

  return windowing;
});
