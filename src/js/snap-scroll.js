/*
* SnapScroll v1.3.0 Copyright (c) 2018 AJ Savino
* https://github.com/koga73/SnapScroll
* MIT License
*/
(function($){
	$.fn.SnapScroll = function(options){
		var _instance = null;

		//Public
		var defaults = {
			events:true,										//Fire events
			eventChangeActive:"snapscroll_change-active",		//Fires when snap point element when snapped
			eventChangeVisible:"snapscroll_change-visible",		//Fires when snap point element is within the window

			classes:true,										//Add classes to elements
			classSnap:"snap-scroll",							//Class applied to snap point elements
			classVisible:"snap-scroll-visible",					//Class applied to a snap point element when within the window
			classActive:"snap-scroll-active",					//Class applied to a snap point element when snapped
			hashes:false,										//Use element id in hash

			scrollDelay:300,									//Delay between scroll events needed to trigger scroll action
			wheelInterval:1000,									//Interval used for wheel to trigger scroll action
			animateDuration:250,								//The amount of time it takes to animate to a snap point
			animateTimeBuffer:100,								//The amount of time to wait after an animation is complete before scrolling can be triggered

			snapTop:true,										//Snap to the top of page regardless of there being an element
			snapBottom:true,									//Snap to the bottom of page regardless of there being an element
			snaps:[],											//Extra snap points not tied to an element

			maxWheelDeviation:100								//Deviation in milliseconds from the average needed to separate wheel events
		};
		$.fn.SnapScroll.defaults = defaults;

		var _consts = {
			_NUM_WHEEL_EVENT_DELTAS:100				//The number of wheel event deltas to store
		};

		var _vars = {
			_$this:this,							//jQuery elements
			_resizer:null,							//Resizer to handle resize events with built in delay

			_snaps:null,							//All snaps including elements, top, bottom, and extras
			_currentSnapIndex:-1,					//Current index in _snaps
			_scrollTimeout:0,						//Timeout used between scroll events
			_lastanimateDuration:0,

			//All of the wheel stuff is to support mouse wheel, touchpad and magic mouse scrolling - all of which come through as wheel events
			_wheelDir:0,							//Which way the user scrolled -1 | 1
			_lastWheelTime:0,						//Last time the page wheel action occured
			_wheelEventDeltas:[],					//Holds the delta times between the last number of _NUM_WHEEL_EVENT_DELTAS wheel events
			_wheelEventDeltaAvg:0,					//The average wheel event delta time based on data stored in _wheelEventDeltas
			_lastWheelEventTime:0					//The last time a wheel event occured
		};

		var _methods = {
			init:function(){
				if (_instance.classes){
					_vars._$this.addClass(_instance.classSnap);
				}
				_vars._resizer = new Resizer({onResize:_methods._handler_resize});
				_methods._handler_resize(); //Call initially

				$(document).on("scroll", _methods._handler_document_scroll);
				$(document).on("keydown", _methods._handler_document_keydown);
				$(window).on("DOMMouseScroll mousewheel wheel", _methods._handler_window_mousewheel);
			},

			destroy:function(){
				$(document).off("scroll", _methods._handler_document_scroll);
				$(document).off("keydown", _methods._handler_document_keydown);
				$(window).off("DOMMouseScroll mousewheel wheel", _methods._handler_window_mousewheel);

				if (_vars._resizer){
					_vars._resizer.destroy();
					_vars._resizer = null;
				}

				_vars._snaps = null;
				_vars._currentSnapIndex = -1;
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
					_vars._scrollTimeout = 0;
				}
				_vars._lastanimateDuration = 0;

				_vars._wheelDir = 0;
				_vars._lastWheelTime = 0;
				_vars._wheelEventDeltas.splice(0, _vars._wheelEventDeltas.length);
				_vars._wheelEventDeltaAvg = 0;
				_vars._lastWheelEventTime = 0;

				if (_instance.classes){
					_vars._$this.removeClass(_instance.classSnap);
				}
			},

			snapClosest:function(){
				var scrollPosition = _methods._getScrollPosition();
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
				var $dirtyEls = [];
				var $active = null;
				_vars._$this.each(function(){
					var $el = $(this);
					if (!$active && $el.offset().top == snap){ //First match
						$active = $el;
					}
					if (_instance.classes){
						if ($active == $el){
							if (!$el.hasClass(_instance.classActive)){
								$el.addClass(_instance.classActive);
								$dirtyEls.push($el);
							}
						} else {
							if ($el.hasClass(_instance.classActive)){
								$el.removeClass(_instance.classActive);
								$dirtyEls.push($el);
							}
						}
					}
				});
				if (_instance.events){
					var dirtyElsLen = $dirtyEls.length;
					if (dirtyElsLen){
						for (var i = 0; i < dirtyElsLen; i++){
							$dirtyEls[i].trigger(_instance.eventChangeActive, $active);
						}
					}
				}
				if (_instance.hashes){
					var hash = "";
					if ($active){
						var activeId = $active.attr("id");
						if (activeId){
							hash = "#" + activeId;
						}
					}
					//TODO: Take query strings into account
					history.replaceState({}, window.location.href, window.location.href.replace(/#.*$/, "") + hash);
				}
				_methods._evalVisibility();

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
				var scrollTop = _methods._getScrollPosition();
				var scrollBottom = scrollTop + window.innerHeight;
				if ((elTop >= scrollTop && elTop < scrollBottom) || (elBottom > scrollTop && elBottom <= scrollBottom)){
					return true;
				}
				return false;
			},

			_evalVisibility:function(){
				if (!_instance.classes){
					return;
				}
				var $dirtyEls = [];
				var $visibleEls = [];
				//Toggle visibility class
				_vars._$this.each(function(){
					var $el = $(this);
					if (_instance.isVisible($el)){
						if (!$el.hasClass(_instance.classVisible)){
							$el.addClass(_instance.classVisible);
							$dirtyEls.push($el);
						}
						$visibleEls.push($el);
					} else {
						if ($el.hasClass(_instance.classVisible)){
							$el.removeClass(_instance.classVisible);
							$dirtyEls.push($el);
						}
					}
				});
				if (_instance.events){
					var dirtyElsLen = $dirtyEls.length;
					for (var i = 0; i < dirtyElsLen; i++){
						$dirtyEls[i].trigger(_instance.eventChangeVisible, {data:$visibleEls});
					}
				}
			},

			_sortNumeric:function(a, b){
				return a - b;
			},

			_handler_document_scroll:function(evt){
				if (_instance.classes){
					_methods._evalVisibility();
				}
				if (_vars._scrollTimeout){
					clearTimeout(_vars._scrollTimeout);
				}
				var animateDelay = (_vars._lastanimateDuration + _instance.animateDuration + _instance.animateTimeBuffer) - new Date().getTime();
				_vars._scrollTimeout = setTimeout(_methods._handler_scroll_timeout, Math.max(_instance.scrollDelay, animateDelay));
			},

			_handler_scroll_timeout:function(){
				clearTimeout(_vars._scrollTimeout);
				_vars._scrollTimeout = 0;

				_instance.snapClosest();
			},

			_scrollTo:function(top){
				var scrollPosition = _methods._getScrollPosition();
				if (scrollPosition == top){
					return;
				}
				_vars._lastanimateDuration = new Date().getTime();

				var $htmlBody = $("html,body");
				$htmlBody.stop(true);
				$htmlBody.animate({
					scrollTop:top
				}, _instance.animateDuration);
			},

			//Wheel events have "inertia" in that touchpad / magic mouse will continue to fire events after the user has stopped
			_handler_window_mousewheel:function(evt){
				evt.preventDefault();

				var shouldScroll = false;
				var now = new Date().getTime();
				if (_vars._lastWheelEventTime){
					//Get event delta and add to array
					var eventDelta = now - _vars._lastWheelEventTime;
					var wheelEventDeltasLen = _vars._wheelEventDeltas.length;
					if (wheelEventDeltasLen == _consts._NUM_WHEEL_EVENT_DELTAS){
						_vars._wheelEventDeltas.shift(); //Remove oldest
					}
					_vars._wheelEventDeltas.push(eventDelta); //Add newest
					wheelEventDeltasLen++;

					//Get array average delta
					_vars._wheelEventDeltaAvg = (_vars._wheelEventDeltaAvg * (wheelEventDeltasLen - 1) + eventDelta) / wheelEventDeltasLen;

					//Get deviation from average and compare to max
					var deviation = Math.abs(eventDelta - _vars._wheelEventDeltaAvg);
					if (deviation >= _instance.maxWheelDeviation){
						_vars._wheelEventDeltas.splice(0, wheelEventDeltasLen); //Wipe array
						shouldScroll = true;
					}
				} else {
					shouldScroll = true;
				}
				_vars._lastWheelEventTime = now;

				//Store scroll direction and call action if past interval
				var delta = Math.max(-1, Math.min(1, (evt.originalEvent.deltaY || evt.originalEvent.wheelDelta || -evt.originalEvent.detail)));
				_vars._wheelDir = Math.abs(delta) / delta;
				if (shouldScroll || new Date().getTime() >= _vars._lastWheelTime + _instance.wheelInterval){
					_methods._handler_wheel_timeout();
				}

				return false;
			},

			_handler_wheel_timeout:function(){
				_vars._lastWheelTime = new Date().getTime();
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
			},

			_getScrollPosition:function(){
				return window.scrollY || document.body.scrollTop || document.documentElement.scrollTop;
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