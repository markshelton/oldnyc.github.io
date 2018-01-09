/*
* debouncedresize: special jQuery event that happens once after a window resize
*
* latest version and complete README available on Github:
* https://github.com/louisremi/jquery-smartresize/blob/master/jquery.debouncedresize.js
*
* Copyright 2011 @louis_remi
* Licensed under the MIT license.
*/
var $event = $.event,
$special,
resizeTimeout;


function clientRectIntersect(a, b) {
  var left = Math.max(a.left, b.left);
  var right = Math.min(a.right, b.right);
  var top = Math.max(a.top, b.top);
  var bottom = Math.min(a.bottom, b.bottom);
  return {
    left: left,
    right: Math.max(left, right),
    top: top,
    bottom: Math.max(bottom, top),
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0)
  };
}


// We check for visblity within:
// 1. The window
// 2. Containing scrollable elements
function isElementInViewport(el) {
  // special bonus for those using jQuery
  if (el instanceof jQuery) {
    el = el[0];
  }

  var elRect = el.getBoundingClientRect();
  var windowRect = {
    top: 0,
    left: 0,
    bottom: $(window).height(),
    right: $(window).width(),
    height: $(window).height(),
    width: $(window).width()
  };

  elRect = clientRectIntersect(elRect, windowRect);
  if (elRect.width * elRect.height == 0) return false;

  var $scrollParents = scrollableParents(el);
  for (var i = 0; i < $scrollParents.length; i++) {
    var scrollParent = $scrollParents.get(i);
    var scrollParentRect = scrollParent.getBoundingClientRect();
    elRect = clientRectIntersect(elRect, scrollParentRect);
    if (elRect.width * elRect.height == 0) return false;
  }

  return true;
}

function isElementScrollable(el) {
  return el.scrollHeight > el.clientHeight;
}

function scrollableParents(node) {
  var $parents = $(node).parents().filter(function(_, e) {
    return isElementScrollable(e);
  });
  return ($parents.length > 0 ? $parents : $('body'));
}

$special = $event.special.debouncedresize = {
  setup: function() {
    $( this ).on( "resize", $special.handler );
  },
  teardown: function() {
    $( this ).off( "resize", $special.handler );
  },
  handler: function( event, execAsap ) {
    // Save the context
    var context = this,
      args = arguments,
      dispatch = function() {
        // set correct event type
        event.type = "debouncedresize";
        $event.dispatch.apply( context, args );
      };

    if ( resizeTimeout ) {
      clearTimeout( resizeTimeout );
    }

    execAsap ?
      dispatch() :
      resizeTimeout = setTimeout( dispatch, $special.threshold );
  },
  threshold: 250
};

/*
 * throttledresize: special jQuery event that happens at a reduced rate compared to "resize"
 *
 * latest version and complete README available on Github:
 * https://github.com/louisremi/jquery-smartresize
 *
 * Copyright 2012 @louis_remi
 * Licensed under the MIT license.
 *
 * This saved you an hour of work? 
 * Send me music http://www.amazon.co.uk/wishlist/HNTU0468LQON
 */
(function($) {

var $event = $.event,
	$special,
	dummy = {_:0},
	frame = 0,
	wasResized, animRunning;

$special = $event.special.throttledresize = {
	setup: function() {
		$( this ).on( "resize", $special.handler );
	},
	teardown: function() {
		$( this ).off( "resize", $special.handler );
	},
	handler: function( event, execAsap ) {
		// Save the context
		var context = this,
			args = arguments;

		wasResized = true;

		if ( !animRunning ) {
			setInterval(function(){
				frame++;

				if ( frame > $special.threshold && wasResized || execAsap ) {
					// set correct event type
					event.type = "throttledresize";
					$event.dispatch.apply( context, args );
					wasResized = false;
					frame = 0;
				}
				if ( frame > 9 ) {
					$(dummy).stop();
					animRunning = false;
					frame = 0;
				}
			}, 30);
			animRunning = true;
		}
	},
	threshold: 0
};

})(jQuery);

var Grid = function() {

    // list of items
  var $grid = null,  // $grid is the <ul>
    // the items
    $items = null,  // these are the <li>s
    // current expanded item's index
    current = -1,
    // position (top) of the expanded item
    // used to know if the preview will expand in a different row
    previewPos = -1,
    // extra amount of pixels to scroll the window
    scrollExtra = 0,
    // extra margin when expanded (between preview overlay and the next items)
    marginExpanded = 10,
    $window = $(window), winsize,
    $body = null,
    // transitionend events
    transEndEventNames = {
      'WebkitTransition' : 'webkitTransitionEnd',
      'MozTransition' : 'transitionend',
      'OTransition' : 'oTransitionEnd',
      'msTransition' : 'MSTransitionEnd',
      'transition' : 'transitionend'
    },
    transEndEventName = transEndEventNames[Modernizr.prefixed('transition')],
    // support for csstransitions
    support = Modernizr.csstransitions,
    // default settings
    settings = {
      minHeight: 500,
      maxHeight: 750,
      speed: 350,
      easing: 'ease'
    };

  function init(grid, config) {
    $grid = $(grid);
    $items = $grid.children('li');
    $body = $('html, body');

    // the settings..
    settings = $.extend(true, {}, settings, config);

    // save item's size and offset
    saveItemInfo(true);
    // get window's size
    getWinSize();
    // initialize some events
    initEvents();
  }

  // add more items to the grid.
  // the new items need to appended to the grid.
  // after that call Grid.addItems(theItems);
  function addItems($newitems) {
    $items = $items.add( $newitems );

    $newitems.each(function() {
      var $item = $(this);
      $item.data({
        offsetTop: $item.offset().top,
        height: $item.height()
      });
    });

    initItemsEvents($newitems);
  }

  // saves the item´s offset top and height (if saveheight is true)
  function saveItemInfo(saveheight) {
    $items.each(function() {
      var $item = $(this);
      $item.data('offsetTop', $item.offset().top);
      if( saveheight ) {
        $item.data('height', $item.height());
      }
    });
  }

  function initEvents() {
    // when clicking an item, show the preview with the item´s info and large
    // image.
    // close the item if already expanded.
    // also close if clicking on the item´s cross
    initItemsEvents($items);
    
    // on window resize get the window´s size again
    // reset some values..
    $window.on('debouncedresize', function() {
      scrollExtra = 0;
      previewPos = -1;
      // save item´s offset
      saveItemInfo();
      getWinSize();
      var preview = $.data($grid, 'preview');
      if (typeof preview != 'undefined') {
        hidePreview();
      }
    });
  }

  function initItemsEvents($items) {
    $items.on('click', 'span.og-close', function() {
      hidePreview();
      $(this).trigger('og-deselect');
      return false;
    }).children('a').on('click', function(e) {
      var $li = $(this).parent();
      // check if item already opened
      if (current === $li.index()) {
        hidePreview()
        $li.trigger('og-deselect');
      } else {
        var previousSelection = current;
        showPreview($li);
        if (previousSelection == -1) {
          $grid.trigger('og-openpreview');
        }
        $li.trigger('og-select');
      }
      return false;
    });
  }

  function getWinSize() {
    winsize = { width : $window.width(), height : $window.height() };
  }

  function showPreview($item) {
    var preview = $.data($grid, 'preview'),
      // item´s offset top
      position = $item.data('offsetTop');

    scrollExtra = 0;

    // if a preview exists and previewPos is different (different row) from
    // item's top then close it
    if (typeof preview != 'undefined') {
      // not in the same row
      if (previewPos !== position) {
        // if position > previewPos then we need to take te current preview's
        // height in consideration when scrolling the window
        if (position > previewPos) {
          scrollExtra = preview.height;
        }
        hidePreview();
      } else {
        // same row 
        preview.update($item);
        return false;
      }
    }

    // update previewPos
    previewPos = position;
    // initialize new preview for the clicked item
    preview = $.data($grid, 'preview', new Preview($item));
    // expand preview overlay
    preview.open();
  }

  function hidePreview() {
    current = -1;
    var preview = $.data($grid, 'preview');
    preview.close();
    $.removeData($grid, 'preview');
  }

  // the preview obj / overlay
  function Preview($item) {
    this.$item = $item;
    this.expandedIdx = this.$item.index();
    this.create();
    this.update();
  }

  Preview.prototype = {
    create : function() {
      // create Preview structure:
      this.$details = $( '<div class="og-details" />' );
      this.$loading = $( '<div class="og-loading"></div>' );
      this.$fullimage = $( '<div class="og-fullimg"></div>' ).append( this.$loading ).append($('<div class="og-details-left" style="display:none">'));
      this.$closePreview = $( '<span class="og-close"></span>' );
      this.$previewInner = $( '<div class="og-expander-inner"></div>' ).append( this.$closePreview, this.$fullimage, this.$details );
      this.$previewLeft = $('<div class="og-previous"></div>');
      this.$previewRight = $('<div class="og-next"></div>');
      this.$previewEl = $( '<div class="og-expander"></div>' ).append( this.$previewInner, this.$previewLeft, this.$previewRight );
      // append preview element to the item
      this.$item.append(this.getEl());
      // set the transitions for the preview and the item
      if (support) {
        this.setTransition();
      }
    },

    update : function( $item ) {
      if( $item ) {
        this.$item = $item;
      }
      
      // if already expanded remove class "og-expanded" from current item and add it to new item
      // $('.og-grid li').removeClass('og-expanded');
      if( current !== -1 ) {
        var $currentItem = $items.eq(current);
        $currentItem.removeClass('og-expanded');
        this.$item.addClass('og-expanded');
        // position the preview correctly
        this.positionPreview();
      }

      // update current value
      current = this.$item.index();

      // update preview´s content
      var $itemEl = this.$item.children('a'),
        eldata = {
          largesrc: $itemEl.data('largesrc'),
        };

      this.$details.empty();
      this.$fullimage.find('.og-details-left').empty();
      $(this.$item).trigger('og-fill', this.$details);

      var self = this;
      
      // remove the current image in the preview
      if (typeof self.$largeImg != 'undefined') {
        self.$largeImg.remove();
      }

      // preload large image and add it to the preview
      // for smaller screens we don´t display the large image (the media query will hide the fullimage wrapper)
      if (self.$fullimage.is(':visible')) {
        this.$loading.show();
        $('<img/>').load(function() {
          var $img = $(this);
          if ($img.attr('src') === self.$item.children('a').data('largesrc')) {
            var $fullimage = self.$fullimage;
            self.$loading.hide();
            $fullimage.find('.og-loading img').remove();
            self.$largeImg = $img.fadeIn(settings.speed);
            $fullimage.append([
                self.$largeImg,
                self.$fullimage.find('.og-details-left').show()]);
          }
        }).attr('src', eldata.largesrc);
      }
    },

    // Open the preview pane
    open: function() {
      setTimeout($.proxy(function() {  
        // set the height for the preview and the item
        var self = this;
        this.setHeights().then(function() {
          // scroll to position the preview in the right place
          self.positionPreview();
        });
      }, this), 25);

      var self = this;
      var goLeft = function() {
        if (current > 0) {
          var $li = $items.eq(current - 1);
          showPreview($li);
          $li.trigger('og-select');
        }
      };
      var goRight = function() {
        if (current < $items.length) {
          var $li = $items.eq(current + 1);
          showPreview($li);
          $li.trigger('og-select');
        }
      };
      $('.og-previous, .og-next').on('click', function() {
        if ($(this).is('.og-previous')) {
          goLeft();
        } else {
          goRight();
        }
      });
      $(document).on('keyup.og', function(e) {
        if (e.keyCode == 37) {
          goLeft();
        } else if (e.keyCode == 39) {
          goRight();
        } else if (e.keyCode == 27) {  // escape
          self.close();
          $grid.trigger('og-deselect');
        }
      });
    },

    // Close the preview pane
    close : function() {
      $('.og-previous, .og-next').off('click');
      $(document).off('keyup.og');

      var self = this,
        onEndFn = function() {
          self.$item.removeClass( 'og-expanded' );
          self.$item.css('height', '');
          self.$previewEl.remove();
        };

      setTimeout($.proxy(function() {
        if (typeof this.$largeImg !== 'undefined') {
          this.$largeImg.fadeOut('fast');
        }
        this.$previewEl.css('height', 0);
        // the current expanded item (might be different from this.$item)
        var $expandedItem = $items.eq(this.expandedIdx);
        $expandedItem.css('height', $expandedItem.data('height')).one(transEndEventName, onEndFn);

        if (!support) {
          onEndFn.call();
        }
      }, this), 25);
      
      return false;
    },

    // TODO: document, rename all these horrible variables.
    // this.$previewEl is the gray area
    // this.$item is the <li>, so its height must include the thumbnail's height!
    calcHeight: function() {
      var maxMargin = 100;  // image height + margin == previewHeight
      var scrollParents = scrollableParents($grid),
          $scrollParent = $(scrollParents.get(0)),
          scrollParentHeight = Math.min($scrollParent.height(), $(window).height()),
          thumbnailHeight = this.$item.data('height'),
          previewHeight = scrollParentHeight - thumbnailHeight - 50;

      if (previewHeight > settings.maxHeight) {
        previewHeight = settings.maxHeight;
      }

      this.previewHeight = previewHeight;  // this.$item.data('eg-height');  // height of image

      this.itemHeight = previewHeight + thumbnailHeight + 10;
    },

    setHeights: function() {
      var deferred = $.Deferred();
      var self = this,
        onEndFn = function() {
          self.$item.addClass('og-expanded');
          deferred.resolve({});
        };

      this.calcHeight();
      this.$previewEl.css('height', this.previewHeight);
      this.$item
        .css('height', this.itemHeight)
        .one(transEndEventName, onEndFn);

      if (!support) {
        onEndFn.call();
      }
      return deferred;
    },

    positionPreview: function() {
      // Scroll the newly-selected item to the top of the page.
      var $item = this.$item;
      var scrollParents = scrollableParents($grid),
          $scrollParent = $(scrollParents.get(0)),
          parentTop = $item.parent().position().top;
      if ($scrollParent.get(0).tagName == 'BODY') {
        parentTop = 0;  // .position() already accounts for <body>
      }
      $scrollParent.animate(
          {scrollTop: $item.position().top - parentTop},
          settings.speed);
    },

    setTransition: function() {
      this.$previewEl.css('transition', 'height ' + settings.speed + 'ms ' + settings.easing);
      this.$item.css('transition', 'height ' + settings.speed + 'ms ' + settings.easing);
    },

    getEl : function() {
      return this.$previewEl;
    }
  }

  return { 
    init: init,
    addItems: addItems,
    showPreview: showPreview,
    hidePreview: hidePreview
  };
};

(function($) {

  var imageMargin = 12;  // TODO(danvk): measure this.

// Returns an array of { height: XXX, images: [] }
// Each entry in images should have a height/width data field.
// TODO(danvk): could just return {height, startIndex, limitIndex} objects.
function partitionIntoRows(images, containerWidth, maxRowHeight) {
  var rows = [];
  var currentRow = [];
  $.each(images, function(i, image) {
    currentRow.push(image);
    var denom = 0;
    $.each(currentRow, function(_, image) {
      denom += $(image).data('eg-width') / $(image).data('eg-height');
    });
    var height = (containerWidth - imageMargin * currentRow.length) / denom;
    if (height < maxRowHeight) {
      rows.push({ height: height, images: currentRow });
      currentRow = [];
    }
  });
  if (currentRow.length > 0) {
    rows.push({ height: maxRowHeight, images: currentRow });
  }
  return rows;
}


function reflow($container) {
  var options = $container.data('og-options');
  var $ul = $container.find('ul.og-grid');
  flowImages($ul.find('li'), $ul.width(), options.rowHeight);
}


function flowImages(lis, width, maxRowHeight) {
  var rows = partitionIntoRows(lis, width, maxRowHeight);
  $.each(rows, function(_, row) {
    var height = Math.round(row.height);
    $.each(row.images, function(_, li) {
      var imgW = $(li).data('eg-width'),
          imgH = $(li).data('eg-height');
      $(li).find('img').attr({
        'width': Math.floor(imgW * (height / imgH)),
        'height': height
      });
    });
    // line wrap happens naturally here.
  });
}


// The image thumbnails all start hidden (by setting data-src instead of src).
// This shows the ones which are above the fold by transferring attributes.
function loadVisibleImages($container) {
  $container.find('img[data-src]').each(function(i, imgEl) {
    var $img = $(imgEl);
    if (isElementInViewport($img)) {
      $img
        .attr('src', $img.attr('data-src'))
        .removeAttr('data-src');
    }
  });
}

/**
 * options = {
 *   rowHeight: NNN
 * }
 * images = [ { src: "", width: M, height: N, largesrc: "", id: "" }, ... ]
 */
$.fn.expandableGrid = function(arg1) {
  var meth = null;
  if ($.type(arg1) === 'object') {
    meth = createExpandableGrid;
  } else if ($.type(arg1) === 'string') {
    if (arg1 === 'select') {
      meth = selectImage;
    } else if (arg1 == 'deselect') {
      meth = deselect;
    } else if (arg1 == 'selectedId') {
      meth = selectedId;
    }
  }
  if (!meth) {
    throw "Invalid expandableGrid call";
  }
  return meth.apply(this, arguments);
};

var createExpandableGrid = function(options, images) {
  var lis = $.map(images, function(image) {
    var $li = $('<li><a><img /></a></li>');
    $li.find('img').attr({
      'data-src': image.src
    });
    $li.find('a').attr({
      'data-largesrc': image.largesrc,
      'href': '#'
    });
    if (image.hasOwnProperty('id')) {
      $li.data('image-id', image.id);
    }
    $li.data({
      'eg-width': image.width,
      'eg-height': image.height
    });
    return $li.get(0);
  });

  $(this).data('og-options', options);

  var $ul = $('<ul class=og-grid>').append($(lis).hide());
  $ul.appendTo(this.empty());
  reflow(this);
  $(lis).show();
  loadVisibleImages(this);
  var container = this;
  $([this.get(0), document]).on('scroll', function() {
    loadVisibleImages($(container));  // new images may have become visible.
  });
  this.on('og-deselect', function() {
    // hack to load new images through the transition.
    var interval = window.setInterval(function() {
      loadVisibleImages($(container));
    }, 100);
    window.setTimeout(function() {
      window.clearInterval(interval);
    }, 400);
  });

  // This should really be an object...
  g = Grid();
  g.init($ul.get(0), options);
  $(this).data('og-grid', g);

  // The initial display may have resulted in new scroll bars.
  // It would be nice to avoid this.
  reflow(this);

  return this;
};

var deselect = function(_) {
  $(this).data('og-grid').hidePreview();
};

var selectImage = function(_, id) {
  var $li = null;
  $(this).find('li').each(function(_, li) {
    if ($(li).data('image-id') == id) {
      $li = $(li);
      return false;
    }
  });
  if (!$li) {
    return false;
  }

  $(this).data('og-grid').showPreview($li);
  return true;
};

var selectedId = function() {
  return $(this).find('li.og-expanded').data('image-id');
};

$(window).on('resize', function( event ) {
  $('ul.og-grid').each(function(_, ul) {
    reflow($(ul).parent());
  });
});

})(jQuery);
