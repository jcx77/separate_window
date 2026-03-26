/**
 * Author: Belousov Alexandr
 */
var __Element = {
	class: '__zoomTarget',
	classPreview: '__previewTarget',
	isPresent: false,
	isPreview: false,
	size: {
		top: 0,
		left: 0,
		width: 0,
		height: 0
	},
	wrapper: undefined,
	elemPreview: undefined,
	addStyle: function() {
		CssControl.insert('preview');
	},
	delStyle: function() {
		CssControl.remove('preview');
	},
	isBigElem: function(elem) {
		var size = [],
			big_width = 0,
			big_height = 0;
		if (elem) {
			size = elem.getBoundingClientRect();
			big_width = document.documentElement.clientWidth * 0.9;
			big_height = document.documentElement.clientHeight * 0.85;
			return !!(size.width > big_width || size.height > big_height);
		}
		return false;
	},
	initClass: function(elem) {
		this.isBigElem(elem) ? this.class = '__zoomTargetBig' : this.class = '__zoomTarget';
	},
	initPreview: function(elem) {
		this.isBigElem(elem) ? this.classPreview = '__previewTargetBig' : this.classPreview = '__previewTarget';
	},
	addWrapper: function() {
		if (!this.isPresent) {
			this.addStyle();
			this.wrapper = document.createElement('span');
			this.wrapper.id = '__panelWrapper';
			this.isPresent = true;
		}
	},
	delWrapper: function() {
		if (this.isPresent) {
			this.delStyle();
			document.body.removeChild(this.wrapper);
			this.isPresent = false;
		}
	},
	showWrapper: function() {
		this.wrapper.style.visibility = 'visible';
	},
	switchOn: function(elem) {
		if (elem) {
			this.elemPreview = elem;
			this.isPreview = true;
			this.addStyle();
			this.initPreview(elem);
			this.elemPreview.classList.add(this.classPreview);
			this.getSize(this.elemPreview);
		} else {
			this.size = {
				height: window.innerHeight,
				width: window.innerWidth
			};
		}
	},
	switchOff: function() {
		if (this.elemPreview) {
			this.delStyle();
			if (this.elemPreview.classList.contains(this.classPreview)) {
				this.elemPreview.classList.remove(this.classPreview);
			}
			this.elemPreview = undefined;
			this.isPreview = false;
		}
	},
	hideWrapper: function() {
		this.wrapper.style.visibility = 'hidden';
	},
	set: function(elem) {
		if (elem && elem.nodeName !== 'HTML' && elem !== document) {
			this.reset();
			this.prototype = elem;
			if (!this.prototype.classList.contains(this.class)) {
				this.initClass(elem);
				this.prototype.classList.add(this.class);
			}
			document.body.appendChild(this.wrapper);
			this.modifyStyle(this.prototype);
			this.showWrapper();
		}
	},
	reset: function() {
		if (this.prototype) {
			this.prototype.classList.remove(this.class);
			delete this.prototype;
		}
	},
	getSize: function(elem) {
		if (elem) {
			this.size = elem.getBoundingClientRect();
		}
		return this.size;
	},
	modifyStyle: function(elem) {
		if (elem) {
			this.getSize(elem);
			this.wrapper.style.top = this.size.top + 'px';
			this.wrapper.style.left = this.size.left - 5 + 'px';
			this.wrapper.style.width = this.size.width + 5 + 'px';
			this.wrapper.style.height = this.size.height + 'px';
		}
	}
};