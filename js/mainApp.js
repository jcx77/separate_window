/**
 * Author: Belousov Alexandr
 */
var __AppPanel = {
	lastEv: 0,
	run: false,
	scroll: 0,
	target: {},
	selector: '',
	_getFromPoint: function (x, y) {
		__Element.hideWrapper();
		var target = document.elementFromPoint(x, y);
		__Element.showWrapper();
		return target;
	},
	_prepare: function (target) {
		Selector.href = document.location.href;
		this.selector = Selector.getSelector(target);
		this.stop();
		this.dellIcon();
		__Element.switchOff();
		SepWinEvents.addEvents();
	},
	updateTab: function () {
		this._prepare(document.body);
		Modification.do(document.body, this.selector);
		ButtonPanel.add();
	},
	applyEntire:function(){
		this.selector = "BODY";
		__BgCmd.sendCmd('apply', {
			selector: "BODY",
			size: {
				width: 		window.innerWidth,
				height: 	window.innerHeight,
				avLeft: 	window.screen.availLeft,
				avTop: 		window.screen.availTop,
				avWidth: 	window.screen.availWidth,
				avHeight: 	window.screen.availHeight,
				entireTab: 	true
			}
		});
	},
	apply: function (target) {
		if (target.tagName == 'IFRAME') {
			__BgCmd.sendCmd('loadToFrame', {});
			setTimeout(function () {
				CmdToFrame.searchInFrame(target);
			}, 500);
		}
		this._prepare(target);
		let width = 150, height = 150, entireTab = false;
		if (target == document.body) {
			width = window.innerWidth;
			height = window.innerHeight;
			entireTab = true;
		} else {
			width = Math.round(__Element.size.width);
			height = Math.round(__Element.size.height);
		}
		__BgCmd.sendCmd('apply', {
			selector: this.selector,
			size: {
				width: width,
				height: height,
				avLeft: window.screen.availLeft,
				avTop: window.screen.availTop,
				avWidth: window.screen.availWidth,
				avHeight: window.screen.availHeight,
				entireTab: entireTab
			}
		});
		Modification.do(target, this.selector);
		ButtonPanel.add();
	},
	blockEvent: function (e) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	},
	cancel: function () {
		Selector.restoreURL();
		__BgCmd.sendCmd('cancel', {});
		CmdToFrame.remove();
		Modification.cancel();
		ButtonPanel.remove();
		EventPanel.remove();
		SepWinEvents.removeEvents();
	},
	dellIcon: function () {
		Observer.disconnectDomChange();
		__Icons.delAllIcon();
	},
	responseSelectors: function () {
		__BgCmd.sendCmd('getItems', {});
	},
	saveSelector: function (newSelector) {
		__BgCmd.sendCmd('saveSelector', { prop: { name: 'css', value: newSelector } });
	},
	saveSize:function(newSize){
		__BgCmd.sendCmd('saveSize', { prop: { name: 'size', value: newSize } });
	},
	start: function () {
		if (Modification.isSeparate) return;
		if (!this.run) {
			this.run = !this.run;
			this.dellIcon();
			__Element.addWrapper();
			window.addEventListener('mousedown', __AppPanel.blockEvent, true);
			window.addEventListener('mouseup', __AppPanel.blockEvent, true);
			window.addEventListener('mousemove', __AppPanel.mouseMove, true);
			window.addEventListener('mouseover', __AppPanel.mouseOver, true);
			window.addEventListener('wheel', __AppPanel.mouseScroll, true);
			window.addEventListener('click', __AppPanel.mouseClick, true);
			window.addEventListener('keydown', __AppPanel.keyPress, true);
		} else {
			this.stop();
		}
	},
	stop: function () {
		if (this.run) {
			this.run = !this.run;
			this.responseSelectors();
			__Element.delWrapper();
			__Element.reset();
			window.removeEventListener('mousedown', __AppPanel.blockEvent, true);
			window.removeEventListener('mouseup', __AppPanel.blockEvent, true);
			window.removeEventListener('mousemove', __AppPanel.mouseMove, true);
			window.removeEventListener('mouseover', __AppPanel.mouseOver, true);
			window.removeEventListener('wheel', __AppPanel.mouseScroll, true);
			window.removeEventListener('click', __AppPanel.mouseClick, true);
			window.removeEventListener('keydown', __AppPanel.keyPress, true);
		}
	},
	mouseOver: function (e) {
		this.blockEvent(e);
		if (e.target && e.target !== document) {
			var tagName = e.target.tagName.toUpperCase() || undefined;
			switch (tagName) {
				case 'VIDEO':
				case 'EMBED':
				case 'OBJECT':
				case 'IFRAME':
				case 'SVG':
					__Element.set(e.target);
					this.scroll = 0;
					break;
				case 'G':
				case 'PATH':
				case 'RECT':
					__Element.set(e.target.parentNode);
					this.scroll = 0;
					break;
			}
		}
	},
	mouseClick: function (e) {
		this.blockEvent(e);
		if (__Element.prototype) {
			this.apply(__Element.prototype);
		} else {
			this.stop();
		}
	},
	mouseScroll: function (e) {
		this.blockEvent(e);
		e.wheelDelta > 0 ? this.scroll++ : this.scroll--;
		var i = 0, target = this.target;
		while (this.scroll != i) {
			if (this.scroll > 0 && target.parentNode.tagName !== 'BODY') {
				target = target.parentNode;
				i++;
			} else {
				target = this._getFromPoint(e.clientX, e.clientY);
				i = this.scroll = 0;
			}
		}
		__Element.set(target);
	},
	mouseMove: function (e) {
		this.blockEvent(e);
		if ((e.timeStamp - this.lastEv) < 30) { return true; }

		this.lastEv = e.timeStamp;
		var target = e.target;
		if (target.id == '__panelWrapper') {
			__Element.hideWrapper();
			target = document.elementFromPoint(e.clientX, e.clientY);
			if ('elementsFromPoint' in document) {
				//Chrome 43
				document.elementsFromPoint(e.clientX, e.clientY).forEach(function (element) {
					switch (element.tagName.toUpperCase()) {
						case 'VIDEO':
						case 'EMBED':
						case 'OBJECT':
						case 'SVG':
							target = element;
							break;
					}
				}, this);
			}
			__Element.showWrapper();
		}

		if (target === this.target || target == document) { return true; }

		this.target = target;

		if (this.target && this.target.tagName !== 'BODY') {
			__Element.set(this.target);
			this.scroll = 0;
		}
	},
	keyPress: function (e) {
		switch (e.keyCode) {
			case 27:
				__AppPanel.stop();
				break;
		}
	}
};
__AppPanel.blockEvent = __AppPanel.blockEvent.bind(__AppPanel);
__AppPanel.mouseOver = __AppPanel.mouseOver.bind(__AppPanel);
__AppPanel.mouseMove = __AppPanel.mouseMove.bind(__AppPanel);
__AppPanel.mouseClick = __AppPanel.mouseClick.bind(__AppPanel);
__AppPanel.mouseScroll = __AppPanel.mouseScroll.bind(__AppPanel);

var __onLoad = function () {
	if(Bookmarks.isEntireTab){
		Bookmarks.isEntireTab = false;
		__AppPanel.updateTab();
	}else{
		__AppPanel.responseSelectors();
		Bookmarks.domChange();
		__BgCmd.sendCmd('isDuplicate', {});	
	}
};
Bookmarks.getHash();
window.addEventListener('DOMContentLoaded', __onLoad);