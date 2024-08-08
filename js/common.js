/**
 * Author: Belousov Alexandr
 */
var CssControl = {
	class: {
		com: '__sepWin',
		btnPanel: '__sepWinBtn',
		eventPanel: '__sepWinEvent'
	},
	css: {},
	name: {
		panel: 'css/panel.css',
		preview: 'css/preview.css',
		window: 'css/window.css',
		video: 'css/video.css'
	},
	setComClass: function (target) {
		target.classList.add(this.class.com);
	},
	isComClass: function (target) {
		return target.classList.contains(this.class.com);
	},
	isBtnClass: function (target) {
		return target.classList.contains(this.class.btnPanel);
	},
	isEventClass: function (target) {
		return target.classList.contains(this.class.eventPanel);
	},
	insert: function (name) {
		if (!this.name.hasOwnProperty(name) || this.css.hasOwnProperty(name)) return 0;
		this.css[name] = document.createElement('link');
		this.css[name].rel = 'stylesheet';
		this.css[name].type = 'text/css';
		this.css[name].href = chrome.extension.getURL(this.name[name]);
		document.head.appendChild(this.css[name]);
	},
	remove: function (name) {
		if (this.css.hasOwnProperty(name)) {
			document.head.removeChild(this.css[name]);
			this.css[name] = undefined;
			delete this.css[name];
		}
	}
};

var Observer = {
	serverDOM: undefined,
	serverTrgtChld: undefined,
	type: [],
	elems: [],
	servers: [],
	timers: {
		onDOM: undefined,
		onChanges: undefined,
		onChangesTrgt: undefined
	},
	targets: [],
	config: {
		attributes: true,
		attributesFilter: ['class'],
		attributesOldValue: true
	},
	configTrgt: {
		childList: true,
		subtree: true
	},
	configDOM: {
		attributes: false,
		characterData: false,
		childList: true,
		subtree: true
	},
	domChange: function () {
		if (!this.serverDOM) {
			this.serverDOM = new MutationObserver(this.onChangeDOM.bind(Observer));
			this.serverDOM.observe(document.body, this.configDOM);
		}
	},
	init: function (elem, type) {
		if (this.elems.indexOf(elem) !== -1) return;
		this.elems.push(elem);
		this.type.push(type);
		var server = new MutationObserver(this.onChanges.bind(Observer));
		var index = this.servers.push(server) - 1;
		this.servers[index].observe(elem, this.config);
		if (type == '__target') {
			this.serverTrgtChld = new MutationObserver(this.onChangesTrgt.bind(Observer));
			this.serverTrgtChld.observe(elem, this.configTrgt);
		}
	},
	onChangesTrgt: function () {
		if (this.timers.onChangesTrgt) {
			clearTimeout(this.timers.onChangesTrgt);
		}
		this.timers.onChangesTrgt = setTimeout(
			function () {
				if (Modification.trgtVideo) {
					this.serverTrgtChld.disconnect();
				} else {
					Modification._searchVideo();
				}
			}.bind(this),
			500);
	},
	onChanges: function (listItems) {
		if (this.timers.onChanges) {
			clearTimeout(this.timers.onChanges);
			for (var i = listItems.length; i--;) {
				if (this.targets.indexOf(listItems[i].target) == -1) {
					this.targets.push(listItems[i].target);
				}
			}
		}
		this.timers.onChanges = setTimeout(
			function () {
				var elem, index, type;
				while (this.targets.length) {
					elem = this.targets[0];
					index = this.elems.indexOf(elem);
					type = this.type[index];
					if (!elem.classList.contains(type)) {
						elem.classList.add(type);
					}
					if (type == '__target') {
						Modification.checkChanges();
						if (VideoControls.isPresent) { VideoControls.observerUpdate(); }
					}
					this.targets.splice(0, 1);
				}
			}.bind(this),
			300
		);
	},
	onChangeDOM: function () {
		if (__Element.isPreview) return;
		if (this.timers.onDOM) { clearTimeout(this.timers.onDOM); }
		this.timers.onDOM = setTimeout(
			function () {
				__Icons.findElement();
				Bookmarks.domChange();
			}.bind(this),
			150);
	},
	disconnectDomChange: function () {
		if (this.serverDOM) {
			clearTimeout(this.timers.onDOM);
			this.serverDOM.disconnect();
			this.serverDOM = undefined;
		}
	},
	disconnect: function (elem, type) {
		var index = this.elems.indexOf(elem);
		clearTimeout(this.timers.onChanges);
		if (index > -1) {
			this.servers[index].disconnect();
			this.servers.splice(index, 1);
			this.elems.splice(index, 1);
			this.type.splice(index, 1);
		}
		if (type == '__target' && this.serverTrgtChld) {
			this.serverTrgtChld.disconnect();
			this.serverTrgtChld = undefined;
		}
	},
	clearServers: function () {
		for (var i = this.servers.length - 1; i >= 0; --i) { this.servers[i].disconnect(); }
		if (this.serverTrgtChld) {
			this.serverTrgtChld.disconnect();
			this.serverTrgtChld = undefined;
		}
		clearTimeout(this.timers.onChangesTrgt);
		this.servers = [];
		this.elems = [];
		this.type = [];
	}
};

var Selector = {
	css: {
		tag: '',
		class: '',
		attr: ''
	},
	href: '',
	invalidSymbolsCss: [':', '@', '\\.','\\,','\\$','\\^','\\?', '%','\\+','\\*', '\\(', '\\)'],
	ignoreClass: ['__target', '__parent', '__onScroll', '__zoomTarget', '__zoomTargetBig', '__targetVideo', '__previewTarget', '__previewTargetBig'],
	attrType: ['name', 'role', 'type', 'id', 'width', 'height', 'align'],
	isVideo: false,
	_getTag: function (elem) {
		this.css.tag = elem.tagName;
		this.css.tag == 'VIDEO' ? this.isVideo = true : this.isVideo = false;
	},
	_getClass: function (elem) {
		var list = elem.classList;
		this.css.class = '';
		if (this.css.tag == 'BODY') return;
		for (var i = 0, len = list.length; i < len; ++i) {
			if (i > 3) break;
			if (this.ignoreClass.indexOf(list[i]) == -1) {
				this.css.class += '.' + this._validClass(list[i]);
			}
		}
	},
	_validClass: function (cssClass) {
		var re;
		this.invalidSymbolsCss.map(function (invalid) {
			re = new RegExp(invalid, 'g');
			cssClass = cssClass.replace(re, 
				invalid.indexOf('\\')==0 ? invalid : '\\' + invalid);
		});
		return cssClass;
	},
	_querySelectorAll: function (selector) {
		var elems = [];
		try {
			elems = document.querySelectorAll(selector);
		} catch (e) {
			console.log('Invalid selector:', selector);
		}
		return elems;
	},
	_isOneElement: function () {
		return this._querySelectorAll(this._formSelector(this.css)).length == 1;
	},
	_getAttr: function (elem) {
		var attr = elem.attributes;
		var matches = 0, val = '';
		this.css.attr = '';
		if (this.css.tag == 'BODY') return;
		for (var i = 0; i < this.attrType.length; ++i) {
			if (matches > 1) break;
			if (attr.hasOwnProperty(this.attrType[i])) {
				matches++;
				switch (this.attrType[i]) {
					case 'id':
						val = '[id]';
						break;
					default:
						val = '[' + this.attrType[i] + '="' + attr[this.attrType[i]].value + '"]';
				}
				this.css.attr += val;
			}
		}
	},
	_formSelector: function (css) {
		var selector = '';
		var order = ['tag', 'class', 'attr'];
		for (var i = 0, len = order.length; i < len; ++i) { selector += css[order[i]]; }
		return selector;
	},
	getSelector: function (elem) {
		var selector = '';
		var target = elem;
		if (target.nodeType == 1) {
			this._getTag(target);
			this._getClass(target);
			if (!this.isVideo || !this._isOneElement()) { this._getAttr(target); }
			if (!this._isOneElement()) {
				var css = this._formSelector(this.css);
				selector = this.getSelector(target.parentNode) + '>' + css;
			} else {
				selector = this._formSelector(this.css);
			}
		}
		return selector;
	},
	getFirstVisibleElem: function (selector) {
		var elems = this._querySelectorAll(selector);
		var elem = undefined;
		var size = {};

		for (var i = 0, len = elems.length; i < len; i++) {
			size = elems[i].getBoundingClientRect();
			if (size.top >= 0 && size.left >= 0) {
				elem = elems[i];
				break;
			}
		}
		return elem;
	},
	getLink: function (element) {
		return encodeURI(this.href + '#sepwin=' + this.getSelector(element));
	},
	modifyURL: function (element) {
		if (element == document.body) return;
		if (element) history.replaceState('', document.title, this.getLink(element));
	},
	restoreURL: function () {
		if (this.href !== '') history.replaceState('', document.title, this.href);
	}
};

var Bookmarks = {
	isBookmark: false,
	isEntireTab:false,
	isPresent: false,
	anchor: 'sepwin=',
	selector: '',
	start: '',
	getHash: function () {
		let hash = window.location.href;
		this.start = hash.indexOf(this.anchor);
		if (this.start !== -1) {
			this.selector = decodeURI(hash.substring(this.start + this.anchor.length));
			this.delHash();
			if (this.selector) {
				this.isPresent = true;
			}
		}
		if (this.selector=="BODY") {
			this.isEntireTab = true;
			this.isPresent = false;
			__AppPanel.applyEntire();
		} 
	},
	delHash: function () {
		var tmp = window.location.href;
		tmp = tmp.replace(tmp.substring(this.start - 1), '');
		history.replaceState('', document.title, tmp);
	},
	domChange: function () {
		if (this.isPresent) {
			setTimeout(function () {
				Bookmarks.isPresent = false;
				Bookmarks.selector = '';
			}, 5000);
			var elems;
			try {
				elems = document.querySelectorAll(this.selector);
			} catch (SYNTAX_ERR) {
				console.log('Invalid selector:', this.selector);
				this.isPresent = false;
				this.selector = '';
				elems = [];
			}
			if (elems.length > 0) {
				this.isPresent = false;
				__Element.getSize(elems[0]);
				__Element.switchOff();
				__AppPanel.apply(elems[0]);
			} else {
				__BgCmd.sendCmd('checkTab', {});
			}
		}
	},
	checkBookmark: function (elem) {
		__BgCmd.sendCmd('checkBookmark', { url: Selector.getLink(elem) });
	},
	addBookmark: function (elem) {
		if (this.isBookmark) {
			__BgCmd.sendCmd('delBookmark', { url: Selector.getLink(elem) });
		} else {
			__BgCmd.sendCmd('addBookmark', { url: Selector.getLink(elem) });
		}
	}
};

var Duplicate = {
	timer: false,
	trgt: {},
	lastStep: false,
	preparation: function (selector) {
		this.findVideo(selector);
	},
	findVideo: function (selector) {
		var elem = this._querySelector(selector);
		if (elem && ('tagName' in elem)) {
			this.lastStep = true;
			switch (elem.tagName) {
				case 'VIDEO':
					this.trgt = elem;
					this._stopPlay(elem);
					break;
				default:
					this.findVideo(selector + ' VIDEO');
					break;
			}
		} else {
			if (!this.lastStep) {
				setTimeout(function () {
					this.findVideo(selector);
				}.bind(this), 500);
			}
		}
	},
	_querySelector: function (selector) {
		var elem;
		try {
			elem = document.querySelector(selector);
		} catch (SYNTAX_ERR) {
			console.log('Invalid selector:', selector);
		}
		return elem;
	},
	_stopPlay: function (elem) {
		if (elem.readyState) {
			elem.pause();
		} else {
			elem.addEventListener('play', Duplicate._canPlay, false);
		}
	},
	_canPlay: function (e) {
		e.stopImmediatePropagation();
		this.pause();
		this.removeEventListener('play', Duplicate._canPlay, false);
	}
};