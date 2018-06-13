/*
* SnapScroll v1.1.0 Copyright (c) 2018 AJ Savino
* https://github.com/koga73/SnapScroll
* MIT License
*/
(function($){
	$.fn.SnapScroll = function(options){
		var _instance = null;

		//Public
		var defaults = {
			useClasses:true,
			classVisible:"snap-scroll-visible",
			classActive:"snap-scroll-active",

			scrollDelay:300,		//ms
			wheelDelay:75,			//ms
			animateTime:250,		//ms
			animateTimeBuffer:100,	//ms

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
			_wheelDir:0,
			_currentSnapIndex:-1,
			_lastAnimateTime:0
		};

		var _methods = {
			init:function(){
				_vars._resizer = new Resizer({onResize:_methods._handler_resize});
				_methods._handler_resize(); //Call initially

				$(document).on("scroll", _methods._handler_document_scroll);
				$(document).on("keydown", _methods._handler_document_keydown);
				$(window).on("DOMMouseScroll mousewheel wheel", _methods._handler_window_mousewheel);
			},

			destroy:function(){
				if (_vars._resizer){
					_vars._resizer.destroy();
					_vars._resizer = null;
				}
				$(document).off("scroll", _methods._handler_document_scroll);
				$(document).off("keydown", _methods._handler_document_keydown);
				$(window).off("DOMMouseScroll mousewheel wheel", _methods._handler_window_mousewheel);

				_vars._snaps = null;
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
					_vars._scrollTimeout = 0;
				}
				if (_vars._wheelTimeout){
					clearTimeout(_vars._wheelTimeout);
					_vars._wheelTimeout = 0;
				}
				_vars._wheelDir = 0;
				_vars._currentSnapIndex = -1;
				_vars._lastAnimateTime = 0;
			},

			snapClosest:function(){
				var scrollPosition = document.documentElement.scrollTop;
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
				_instance.snapIndex(closestIndex);
			},

			snapPrev:function(){
				_instance.snapIndex(_vars._currentSnapIndex - 1);
			},

			snapNext:function(){
				_instance.snapIndex(_vars._currentSnapIndex + 1);
			},

			snapIndex:function(index){
				index = Math.min(Math.max(index, 0), _vars._snaps.length - 1);
				_vars._currentSnapIndex = index;
				var snap = _vars._snaps[index];

				//Eval active/visible classes
				if (_instance.useClasses){
					var $active = null;
					_vars._$this.each(function(){
						var $el = $(this);
						$el.removeClass(_instance.classActive);
						if ($active){ //First match
							return;
						}
						if ($el.offset().top == snap){
							$active = $el;
						}
					});
					if ($active){
						$active.addClass(_instance.classActive);
					}
					_methods._evalVisibility();
				}

				//Animate
				_methods._scrollTo(snap);
			},

			getSnapIndex:function(){
				return _vars._currentSnapIndex;
			},

			//Update snaps
			update:function(){
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

			isVisible:function($el){
				var elTop = $el.offset().top;
				var elBottom = elTop + $el.height();
				var scrollTop = document.documentElement.scrollTop;
				var scrollBottom = scrollTop + window.innerHeight;
				if ((elTop >= scrollTop && elTop < scrollBottom) || (elBottom > scrollTop && elBottom <= scrollBottom)){
					return true;
				}
				return false;
			},

			_evalVisibility:function(){
				//Toggle visibility class
				_vars._$this.each(function(){
					var $el = $(this);
					if (_instance.isVisible($el)){
						$el.addClass(_instance.classVisible);
					} else {
						$el.removeClass(_instance.classVisible);
					}
				});
			},

			_sortNumeric:function(a, b){
				return a - b;
			},

			_handler_document_scroll:function(evt){
				if (_instance.useClasses){
					_methods._evalVisibility();
				}
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
				}
				var animateDelay = (_vars._lastAnimateTime + _instance.animateTime + _instance.animateTimeBuffer) - new Date().getTime();
				_vars._scrollTimeout = setTimeout(_methods._handler_scroll_timeout, Math.max(_instance.scrollDelay, animateDelay));
			},

			_handler_scroll_timeout:function(){
				clearTimeout(_vars._scrollTimeout);
				_vars._scrollTimeout = 0;

				_instance.snapClosest();
			},

			_scrollTo:function(top){
				var scrollPosition = document.documentElement.scrollTop;
				if (scrollPosition == top){
					return;
				}
				_vars._lastAnimateTime = new Date().getTime();

				var $htmlBody = $("html,body");
				$htmlBody.stop(true);
				$htmlBody.animate({
					scrollTop:top
				}, _instance.animateTime);
			},

			_handler_window_mousewheel:function(evt){
				evt.preventDefault();

				if (_vars._wheelTimeout){
					clearTimeout(_vars._wheelTimeout);
				}
				_vars._wheelTimeout = setTimeout(_methods._handler_wheel_timeout, _instance.wheelDelay);

				var delta = Math.max(-1, Math.min(1, (evt.originalEvent.deltaY || evt.originalEvent.wheelDelta || -evt.originalEvent.detail)));
				_vars._wheelDir = Math.abs(delta) / delta;

				return false;
			},

			_handler_wheel_timeout:function(){
				clearTimeout(_vars._wheelTimeout);
				_vars._wheelTimeout = 0;

				if (_vars._wheelDir < 0){
					_instance.snapPrev();
				} else if (_vars._wheelDir > 0){
					_instance.snapNext();
				}
			},

			_handler_document_keydown:function(evt){
				switch (evt.keyCode){
					case 38: //Up
						_instance.snapPrev();
						break;
					case 40: //Down
						_instance.snapNext();
						break;
				}
			},

			_handler_resize:function(width, height){
				_instance.update();
				if (_vars._currentSnapIndex == -1){
					_instance.snapClosest();
				} else {
					_instance.snapIndex(_vars._currentSnapIndex);
				}
			}
		};

		_instance = $.extend({
			init:_methods.init,
			destroy:_methods.destroy,
			snapClosest:_methods.snapClosest,
			snapPrev:_methods.snapPrev,
			snapNext:_methods.snapNext,
			snapIndex:_methods.snapIndex,
			getSnapIndex:_methods.getSnapIndex,
			update:_methods.update,
			isVisible:_methods.isVisible
		}, defaults, options);
		_instance.init();
		return _instance;
	};

	/*
	* Resizer v1.0.2 Copyright (c) 2018 AJ Savino
	* https://github.com/koga73/Resizer
	* MIT License
	*/
	function Resizer(params){
		var _instance = null;

		var _vars = {
			callbackDelay:300,      //Time in ms to wait before calling onResize

			_lastOrientation:window.orientation,
			_timeout:0
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
					_vars._timeout = 0;
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
					if (orientation == _vars._lastOrientation){
						return;
					}
					_vars._lastOrientation = orientation;
				}
				if (_vars._timeout){
					clearTimeout(_vars._timeout);
				}
				_vars._timeout = setTimeout(_methods._handler_timeout, _instance.callbackDelay);
			},

			_handler_timeout:function(){
				clearTimeout(_vars._timeout);
				_vars._timeout = 0;
				_instance.onResize(_instance.getWidth(), _instance.getHeight());
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