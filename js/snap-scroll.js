/*
* AJ Savino
* Moxie - 6/7/2018
*
* Javascript library to snap to page sections while scrolling and with mouse wheel
* https://github.com/koga73/SnapScroll
*/
function SnapScroll(tagSelector){
	var _instance = null;
	
	var _consts = {
		_DEFAULT_TAG_SELECTOR:"header, section, footer",
		_SCROLL_DELAY:300,	//ms
		_WHEEL_DELAY:150,	//ms
		_ANIMATE_TIME:250	//ms
	};
	
	var _vars = {
		_tagSelector:_consts._DEFAULT_TAG_SELECTOR,
		_scrollTimeout:0,
		_wheelTimeout:0,
		_wheelDir:0,
		_currentSnapIndex:0,
		_isAnimating:false
	};
	
	var _methods = {
		init:function(tagSelector){
			_vars._tagSelector = tagSelector || _consts._DEFAULT_TAG_SELECTOR;
			
			$(document).on("scroll", _methods._handler_document_scroll);
			$(window).on("mousewheel", _methods._handler_window_mousewheel);
			$(window).on("DOMMouseScroll", _methods._handler_window_mousewheel);
			
			//Snap to closest on init - page could already be scrolled
			_methods.snapClosest();
		},

		destory:function(){
			if (_vars._scrollTimeout){
				clearTimeout(_vars._scrollTimeout);
				_vars._scrollTimeout = 0;
			}
			if (_vars._wheelTimeout){
				clearTimeout(_vars._wheelTimeout);
				_vars._wheelTimeout = 0;
			}
			
			$(document).off("scroll", _methods._handler_document_scroll);
			$(window).off("mousewheel", _methods._handler_window_mousewheel);
			$(window).off("DOMMouseScroll", _methods._handler_window_mousewheel);
		},
		
		snapClosest:function(){
			var $closest = null;
			var closestDist = -1;
			var scrollPosition = $(document).scrollTop();
			
			var $tags = _methods._getTags();
			$tags.each(function(){
				var $tag = $(this);
				var tagTop = $tag.offset().top;
				var dist = Math.abs(tagTop - scrollPosition);
				if (closestDist == -1 || dist < closestDist){
					closestDist = dist;
					$closest = $tag;
				}
			});
			
			var distFromBottom = $(document).height() - (window.scrollY + window.innerHeight);
			if (distFromBottom <= closestDist){
				_methods.snapIndex($tags.length - 1);
			} else {
				_methods.snapIndex($tags.index($closest));
			}
		},
		
		snapPrev:function(){
			_methods.snapIndex(_vars._currentSnapIndex - 1);
		},
		
		snapNext:function(){
			_methods.snapIndex(_vars._currentSnapIndex + 1);
		},
		
		snapIndex:function(index){
			var $tags = _methods._getTags();
			_vars._currentSnapIndex = Math.min(Math.max(index, 0), $tags.length - 1);
			_methods._scrollTo($($tags[_vars._currentSnapIndex]).offset().top);
		},
		
		getSnapIndex:function(){
			return _vars._currentSnapIndex;
		},
		
		_getTags:function(){
			var $tags = $(_vars._tagSelector);
			$tags.sort(_methods._sort_offsetTop);
			return $tags;
		},
		
		_sort_offsetTop:function(a, b){
			return $(a).offset().top > $(b).offset().top;
		},
		
		_handler_document_scroll:function(evt){
			if (_vars._isAnimating){
				return;
			}
			if (_vars._scrollTimeout){
				clearTimeout(_vars._scrollTimeout);
			}
			_vars._scrollTimeout = setTimeout(_methods._handler_scroll_timeout, _consts._SCROLL_DELAY);
		},
		
		_handler_scroll_timeout:function(){
			clearTimeout(_vars._scrollTimeout);
			_vars._scrollTimeout = 0;
			
			_methods.snapClosest();
		},
		
		_scrollTo:function(top){
			_vars._isAnimating = true;
			
			var $htmlBody = $("html,body");
			$htmlBody.stop(true);
			$htmlBody.animate({
				scrollTop:top
			}, _consts._ANIMATE_TIME, function(){
				//Scroll event may fire AFTER complete
				//In this case no harm is done so we leave it as is
				//https://bugs.jquery.com/ticket/14820
				_vars._isAnimating = false;
			});
		},
		
		_handler_window_mousewheel:function(evt){
			evt.preventDefault();
			
			_vars._isAnimating = true;
			if (_vars._wheelTimeout){
				clearTimeout(_vars._wheelTimeout);
			}
			_vars._wheelTimeout = setTimeout(_methods._handler_wheel_timeout, _consts._WHEEL_DELAY);
			
			var delta = evt.originalEvent.deltaY;
			_vars._wheelDir = Math.abs(delta) / delta;
			
			return false;
		},
		
		_handler_wheel_timeout:function(){
			clearTimeout(_vars._wheelTimeout);
			_vars._wheelTimeout = 0;
			
			if (_vars._wheelDir < 0){
				_methods.snapPrev();
			} else if (_vars._wheelDir > 0){
				_methods.snapNext();
			}
		}
	};
	
	_instance = {
		init:_methods.init,
		destroy:_methods.destroy,
		snapClosest:_methods.snapClosest,
		snapPrev:_methods.snapPrev,
		snapNext:_methods.snapNext,
		snapIndex:_methods.snapIndex,
		getSnapIndex:_methods.getSnapIndex
	};
	_instance.init();
};