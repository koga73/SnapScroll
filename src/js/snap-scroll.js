/*
* AJ Savino
* Moxie - 6/7/2018
*
* Javascript library to snap to page sections while scrolling and with mouse wheel
* https://github.com/koga73/SnapScroll
*/
(function($){
	$.fn.SnapScroll = function(options){
		var _instance = null;

		var defaults = {
			scrollDelay:300,	//ms
			wheelDelay:150,		//ms
			animateDelay:500,	//ms
			animateTime:250,	//ms
			
			snapTop:true,
			snapBottom:true,
			snaps:[]
		};
		$.fn.SnapScroll.defaults = defaults;

		var _vars = {
			_$this:this,
			_resizer:null,
			
			_snaps:null,
			_scrollTimeout:0,
			_wheelTimeout:0,
			_animationTimeout:0,
			_wheelDir:0,
			_currentSnapIndex:-1,
			_isAnimating:false
		};

		var _methods = {
			init:function(){
				_vars._resizer = new Resizer({onResize:_methods._handler_resize});
				_methods._handler_resize(); //Call initially
				
				$(document).on("scroll", _methods._handler_document_scroll);
				$(document).on("keydown", _methods._handler_document_keydown);
				$(window).on("mousewheel", _methods._handler_window_mousewheel);
				$(window).on("DOMMouseScroll", _methods._handler_window_mousewheel);
			},

			destory:function(){
				if (_vars._resizer){
					_vars._resizer.destroy();
					_vars._resizer = null;
				}
				$(document).off("scroll", _methods._handler_document_scroll);
				$(document).off("keydown", _methods._handler_document_keydown);
				$(window).off("mousewheel", _methods._handler_window_mousewheel);
				$(window).off("DOMMouseScroll", _methods._handler_window_mousewheel);
				
				_vars._snaps = null;
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
					_vars._scrollTimeout = 0;
				}
				if (_vars._wheelTimeout){
					clearTimeout(_vars._wheelTimeout);
					_vars._wheelTimeout = 0;
				}
				if (_vars._animateTimeout){
					clearTimeout(_vars._animateTimeout);
					_vars._animateTimeout = 0;
				}
				_vars._wheelDir = 0;
				_vars._currentSnapIndex = -1;
				_vars._isAnimating = false;
			},

			snapClosest:function(){
				var scrollPosition = window.scrollY;
				var closestIndex = -1;
				var closestDist = -1;
				var snaps = _vars._snaps;
				var snapsLen = snaps.length;
				for (var i = 0; i < snapsLen; i++){
					var dist = Math.abs(snaps[i] - scrollPosition);
					if (closestDist == -1 || dist < closestDist){
						closestDist = dist;
						closestIndex = i;
					}
				}
				_methods.snapIndex(closestIndex);
			},

			snapPrev:function(){
				_methods.snapIndex(_vars._currentSnapIndex - 1);
			},

			snapNext:function(){
				_methods.snapIndex(_vars._currentSnapIndex + 1);
			},

			snapIndex:function(index){
				index = Math.min(Math.max(index, 0), _vars._snaps.length - 1);
				_vars._currentSnapIndex = index;
				_methods._scrollTo(_vars._snaps[index]);
			},

			getSnapIndex:function(){
				return _vars._currentSnapIndex;
			},
			
			updateSnaps:function(){
				var snaps = _instance.snaps.concat(); //Copy
				var pageBottom = $(document).height() - window.innerHeight;
				
				//Add tags
				var $tags = _vars._$this;
				$tags.each(function(){
					snaps.push($(this).offset().top);
				});
				
				//Add top
				if (_instance.snapTop){
					snaps.push(0);
				}
				//Add bottom
				if (_instance.snapBottom){
					snaps.push(pageBottom);
				}
				
				//Filter duplicates and below page bottom
				snaps = snaps.reduce(function(arr, snap){
					if (arr.indexOf(snap) == -1 && snap <= pageBottom){
						arr.push(snap);
					}
					return arr;
				}, []);
				
				//Sort
				snaps.sort(_methods._sortNumeric);
				
				_vars._snaps = snaps;
				return _vars._snaps;
			},
			
			_sortNumeric:function(a, b){
				return a - b;
			},
			
			_handler_document_scroll:function(evt){
				if (_vars._isAnimating){
					return;
				}
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
				}
				_vars._scrollTimeout = setTimeout(_methods._handler_scroll_timeout, _instance.scrollDelay);
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
				}, _instance.animateTime, function(){
					//Scroll event may fire AFTER complete
					//https://bugs.jquery.com/ticket/14820
					if (_vars._animateTimeout){
						clearTimeout(_vars._animateTimeout);
					}
					_vars._animateTimeout = setTimeout(_methods._handler_animate_timeout, _instance.animateDelay);
				});
			},

			_handler_window_mousewheel:function(evt){
				evt.preventDefault();

				_vars._isAnimating = true;
				if (_vars._wheelTimeout){
					clearTimeout(_vars._wheelTimeout);
				}
				_vars._wheelTimeout = setTimeout(_methods._handler_wheel_timeout, _instance.wheelDelay);

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
			},
			
			_handler_animate_timeout:function(){
				clearTimeout(_vars._animateTimeout);
				_vars._animateTimeout = 0;
				_vars._isAnimating = false;
			},

			_handler_document_keydown:function(evt){
				switch (evt.keyCode){
					case 38: //Up
						_methods.snapPrev();
						break;
					case 40: //Down
						_methods.snapNext();
						break;
				}
			},
			
			_handler_resize:function(width, height){
				_methods.updateSnaps();
				_methods.snapClosest();
			}
		};

		_instance = $.extend({
			snapTop:_vars.snapTop,
			snapBottom:_vars.snapBottom,

			init:_methods.init,
			destroy:_methods.destroy,
			snapClosest:_methods.snapClosest,
			snapPrev:_methods.snapPrev,
			snapNext:_methods.snapNext,
			snapIndex:_methods.snapIndex,
			getSnapIndex:_methods.getSnapIndex,
			updateSnaps:_methods.updateSnaps
		}, defaults, options);
		_instance.init();
	};
	
	function Resizer(params){
		var _instance = null;

		var _vars = {
			callbackDelay:300,      //Time in ms to wait before calling onResize

			_lastOrientation:window.orientation,
			_timeout:null,
		};

		var _methods = {
			init:function(){
				if (window.addEventListener){
					window.addEventListener("resize", _methods._handler_resize, false);
					window.addEventListener("orientationchange", _methods._handler_resize, false);
				} else if (window.attachEvent){
					window.attachEvent("onresize", _methods._handler_resize);
					window.attachEvent("onorientationchange", _methods._handler_resize);
				}
			},

			destroy:function(){
				var timeout = _vars._timeout;
				if (timeout){
					clearTimeout(timeout);
					_vars._timeout = null;
				}
				_instance.onResize = null;

				if (window.removeEventListener){
					window.removeEventListener("resize", _methods._handler_resize);
					window.removeEventListener("orientationchange", _methods._handler_resize);
				} else if (window.detachEvent){
					window.detachEvent("onresize", _methods._handler_resize);
					window.detachEvent("onorientationchange", _methods._handler_resize);
				}
			},

			getWidth:function(){
				return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
			},

			getHeight:function(){
				return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
			},

			_handler_resize:function(){
				if ("onorientationchange" in window){
					var orientation = window.orientation;
					if (orientation != _vars._lastOrientation){
						_vars._lastOrientation = orientation;
					} else {
						return;
					}
				}
				var timeout = _vars._timeout;
				if (timeout){
					clearTimeout(timeout);
					_vars._timeout = null;
				}
				_vars._timeout = setTimeout(function(){
					clearTimeout(timeout);
					_vars._timeout = null;
					_instance.onResize(_instance.getWidth(), _instance.getHeight());
				}, _instance.callbackDelay);
			}
		};

		_instance = {
			callbackDelay:_vars.callbackDelay,

			init:_methods.init,
			destroy:_methods.destroy,
			getWidth:_methods.getWidth,
			getHeight:_methods.getHeight,
			onResize:null
		};
		for (var param in params){
			_instance[param] = params[param];
		}
		_instance.init();
		return _instance;
	};
})(jQuery);