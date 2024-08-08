/**
 * Author: Belousov Alexandr
 */
var Frame = {
	isVideo: false,
	isFrame: false,
	target: undefined,
	href: undefined,
	childFrames: [],
	observer: undefined,
	obsTrgt: undefined,
	timer: undefined,
	timerTrgt: undefined,

	checkFrames: function (frames) {
		this.childFrames = [];
		var style;
		for (var i = frames.length; i--;) {
			style = getComputedStyle(frames[i]);
			if (style.display !== 'none' && frames[i].contentWindow) {
				this.childFrames.push(frames[i]);
			}
		}
	},
	disconnectObserve: function () {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = undefined;
		}
	},
	disconnectObserveTrgt: function () {
		if (this.obsTrgt) {
			this.obsTrgt.disconnect();
			this.obsTrgt = undefined;
		}
	},
	observeDom: function () {
		if (!this.observer) {
			this.observer = new MutationObserver(this.onChangeDOM.bind(this));
			this.observer.observe(document.body,
				{
					attributes: false,
					characterData: false,
					childList: true,
					subtree: true
				});
		}
	},
	observeTrgt: function () {
		if (!this.obsTrgt && this.isVideo) {
			this.obsTrgt = new MutationObserver(this.onChangeTrgt.bind(this));
			this.obsTrgt.observe(document.body,
				{
					attributes: false,
					characterData: false,
					childList: true,
					subtree: true
				});
		}
	},
	onChangeTrgt: function () {
		if (this.timerTrgt) { clearTimeout(this.timerTrgt); }
		this.timerTrgt = setTimeout(
			function () {
				if (document.querySelector('VIDEO,OBJECT') !== this.target) {
					this.disconnectObserveTrgt();
					if (ModificationFrame.isSeparate) {
						ModificationFrame.cancel();
						SendCmd.toParent('isCancel');
						this.reset();
						this.search();
					}
				}
			}.bind(this),
			350);
	},
	onChangeDOM: function () {
		if (!this.target) {
			if (this.timer) { clearTimeout(this.timer); }
			this.timer = setTimeout(
				function () {
					Frame.search();
					Frame.isVideo = Frame.isFrame = false;
				},
				250);
		} else {
			this.disconnectObserve();
		}
	},
	processingFrame: function (iframes) {
		this.isFrame = true;
		this.checkFrames(iframes);
		SendCmd.toChild('searchVideo');

	},
	processingVideo: function (element) {
		if (element.tagName == 'VIDEO' && element.currentSrc == '') return 0;
		this.isVideo = true;
		this.target = element;
		this.observeTrgt();
		SendCmd.toParent('isVideo');
		chrome.runtime.sendMessage({ cmd: 'loadPlayer', arg: { href: this.href } });
	},
	reset: function () {
		this.target = undefined;
		this.childFrames = [];
		this.disconnectObserve();
		this.disconnectObserveTrgt();
		this.isFrame = this.isVideo = false;
		SendCmd.toParent('clear');
	},
	search: function () {
		if (this.isVideo || this.isFrame) return false;
		var element = document.querySelector('VIDEO,OBJECT');
		if (element) {
			this.processingVideo(element);
		} else {
			var iframes = document.querySelectorAll('IFRAME');
			if (iframes.length > 0) {
				this.processingFrame(iframes);
			}
		}
		this.observeDom();
	},
	setTarget: function (source) {
		this.childFrames.map(function (frame) {
			if (frame.contentWindow == source) {
				this.target = frame;
			}
		}, this);
	}
};

var CmdIcoming = {
	listener: function (event) {
		if (event) {
			if (event.data.hasOwnProperty('cmd')) {
				event.stopImmediatePropagation();
				CmdIcoming.cmd(event.source, event.data.cmd, event.data.arg);
			}
		}
	},
	cmd: function (source, cmd, arg) {
		if (this.hasOwnProperty(cmd)) {
			this[cmd](source, arg);
		}
	},
	clear: function () {
		SendCmd.toParent('clear');
	},
	remove: function () {
		if (!Frame) return;
		if (Frame.isFrame) { SendCmd.toTarget('remove'); }
		Frame.disconnectObserve();
		Frame.disconnectObserveTrgt();
		if (ModificationFrame.isSeparate) ModificationFrame.cancel();
		window.removeEventListener('message', CmdIcoming.listener, true);
		Frame = undefined;
		SendCmd = undefined;
		CssControl = undefined;
		ModificationFrame = undefined;
		CmdIncoming = undefined;
		VideoControls = undefined;
	},
	searchVideo: function () {
		Frame.search();
	},
	isVideo: function (source) {
		if (!Frame.target) {
			SendCmd.toParent('isVideo');
			Frame.setTarget(source);
		}
	},
	cancel: function () {
		if (Frame.target) {
			if (Frame.isFrame) {
				SendCmd.toTarget('cancel');
			}
			if (ModificationFrame.isSeparate) {
				ModificationFrame.cancel();
				SendCmd.toParent('isCancel');
			}
		}
	},
	modify: function () {
		if (Frame.target) {
			if (Frame.isFrame) {
				SendCmd.toTarget('modify');
			}
			if (!ModificationFrame.isSeparate) {
				ModificationFrame.do(Frame.target);
				SendCmd.toParent('isModify');
			}
		}
	},
	toggleFullScr: function () {
		SendCmd.toParent('toggleFullScr');
	},
	toogleFullScrIco: function (source, arg) {
		if (Frame.target) {
			if (Frame.isFrame) {
				SendCmd.toTarget('toogleFullScrIco', { state: arg.state });
			}
			if (Frame.isVideo) {
				VideoControls.toogleFullScrIco(arg.state);
			}
		}
	},
	minimizeWin:function(){
		SendCmd.toParent('minimizeWin');
	},
	restoreWin:function(){
		SendCmd.toParent('restoreWin');
	}
};

var SendCmd = {
	toParent: function (command) {
		parent.postMessage({ cmd: command }, '*');
	},
	toChild: function (command, arg) {
		if (Frame.isFrame) {
			Frame.childFrames.map(function (frame) {
				frame.contentWindow.postMessage({ cmd: command, arg: arg }, '*');
			}, this);
		}
	},
	toTarget: function (command) {
		Frame.target.contentWindow.postMessage({ cmd: command }, '*');
	}
};

var CssControl = {
	class: {
		com: '__sepWin'
	},
	css: {},
	name: {
		iframe: 'css/iframe.css',
		video: 'css/video.css'
	},
	frame: '',
	setComClass: function (target) {
		target.classList.add(this.class.com);
	},
	isComClass: function (target) {
		return target.classList.contains(this.class.com);
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

var ModificationFrame = {
	isSeparate: false,
	target: undefined,
	_modifyStyle: function (elem, style, isSet) {
		if (CssControl.isComClass(elem)) return 0;
		if (isSet) {
			elem.classList.add(style);
		} else {
			elem.classList.remove(style);
		}
	},
	_hideTextNode: function (elem, hide) {
		if (hide) {
			elem['oldValue'] = elem.nodeValue;
			elem.nodeValue = '';
		} else {
			elem.nodeValue = elem['oldValue'];
			delete elem['oldValue'];
		}
	},
	_modifyOne: function (elem, isSet) {
		let child = elem.parentNode.firstChild;
		while (child) {
			if (child !== elem && child.tagName !== 'SCRIPT' && child.tagName !== 'LINK') {
				switch (child.nodeType) {
					case 1:
						this._modifyStyle(child, '__hidden', isSet);
						break;
					case 3:
						this._hideTextNode(child, isSet);
						break;
				}
			}
			child = child.nextSibling;
		}
		this._modifyStyle(elem.parentNode, '__parent', isSet);
	},
	_modifyTarget: function (target, isSet) {
		if (target.tagName == 'VIDEO') {
			isSet ?
				VideoControls.init(target) :
				VideoControls.remove();
		}
		this._modifyStyle(target, '__target', isSet);
	},
	_modifyParents: function (elem, isSet) {
		if (elem && elem.tagName !== 'BODY') {
			this._modifyOne(elem, isSet);
			this._modifyParents(elem.parentNode, isSet);
		}
	},
	do: function (target) {
		CssControl.insert('iframe');
		this.isSeparate = true;
		this.scrollBefore = {
			top: document.body.scrollTop,
			left: document.body.scrollLeft
		};
		this.target = target;
		if (this.target) {
			try {
				this._modifyTarget(this.target, true);
				this._modifyParents(this.target, true);
			} catch (e) {
				this.errorRestore();
				console.log(e);
			}
		}
	},
	cancel: function () {
		if (this.target) {
			try {
				this._modifyParents(this.target, false);
				this._modifyTarget(this.target, false);
			} catch (e) {
				this.errorRestore();
				console.log(e);
			}
		}
		document.body.scrollTop = this.scrollBefore.top;
		document.body.scrollLeft = this.scrollBefore.left;
		this.target = undefined;
		this.isSeparate = false;
		CssControl.remove('iframe');
	},
	errorRestore: function () {
		var all = document.querySelectorAll('.__hidden,.__parent');
		this._modifyTarget(this.target, false);
		for (var i = all.length - 1; i >= 0; --i) {
			all[i].classList.remove('__hidden', '__parent');
		}
	}
};
if (window !== top) {
	window.addEventListener('message', CmdIcoming.listener, false);
	Frame.href = document.location.href;
}