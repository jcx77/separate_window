/**
 * Author: Belousov Alexandr
 */
var __Icons = {
	icons: [],
	hideIcons: false,
	targets: [],
	isEvtResize: false,
	selectors: undefined,
	timer: undefined,
	addEventResize: function () {
		if (this.selectors) {
			if (!this.isEvtResize) {
				window.addEventListener('click', __Icons.click, true);
				window.addEventListener('resize', __Icons.resize);
				window.addEventListener('scroll', __Icons.scroll, true);
				this.isEvtResize = true;
			}
		}
	},
	click: function (event) {
		let target = event.target;
		if (target.classList.contains('__iconSepWin')) {
			__Icons.icons.forEach(function (icon) {
				if (icon.isIcon(target)) {
					icon.click(event);
					return false;
				}
			});
		}
	},
	delEventResize: function () {
		this.isEvtResize = false;
		window.removeEventListener('click', __Icons.click, true);
		window.removeEventListener('resize', __Icons.resize);
		window.removeEventListener('scroll', __Icons.scroll, true);
	},
	delAllIcon: function () {
		this.icons.forEach(function (icon) { icon.delete(); });
		this.icons = [];
		this.targets = [];
		clearTimeout(this.timer);
		this.selectors = undefined;
		this.delEventResize();
	},
	_isVisible: function (trgt) {
		let size = trgt.getBoundingClientRect(),
			top = size.top + window.pageYOffset,
			left = size.left + window.pageXOffset;
		return (top >= window.pageYOffset && top <= (window.innerHeight + window.pageYOffset) && left >= window.pageXOffset);
	},
	findElement: function () {
		if (this.hideIcons) return;
		if (this.selectors && !Modification.isSeparate) {
			this.selectors.forEach(function (selector) {
				var elems = document.querySelectorAll(selector);
				for (var i = 0, length = elems.length; i < length; i++) {
					if (!this._isVisible(elems[i])) { continue; }
					if (this.targets.indexOf(elems[i]) == -1) {
						var icon = new Icon(elems[i]);
						this.icons.push(icon);
						this.targets.push(elems[i]);
					}
				}
				this.iconsSetPosition();
			}.bind(this));
		}
	},
	iconsSetPosition: function () {
		this.icons.forEach(
			function (icon, i) {
				icon.getPosition();
				if (icon.checkTarget() && icon.checkVisible()) {
					for (var j = 0, len = i - 1; j <= len; j++) {
						icon.checkPosition(this.icons[j].position);
					}
					icon.setPosition();
				} else {
					var i_trgt = this.targets.indexOf(icon.getTrgt());
					if (i_trgt > -1) { this.targets.splice(i_trgt, 1); }
					icon.delete();
					this.icons.splice(i, 1);
				}
			}.bind(this));
	},
	resize: function () {
		if (this.timer) { clearTimeout(this.timer); }
		this.timer = setTimeout(
			function () {
				__Icons.iconsSetPosition();
			}.bind(this),
			100);
	},
	scroll: function () {
		if (this.timer) { clearTimeout(this.timer); }
		this.timer = setTimeout(
			function () {
				__Icons.findElement();
			}.bind(this),
			60);
	},
	setSelectors: function (css, hide) {
		this.delAllIcon();
		this.hideIcons = hide;
		this.selectors = css;
		this.addEventResize();
		this.findElement();
	}
};
__Icons.resize = __Icons.resize.bind(__Icons);
function Icon(target) {
	var trgt = null, icon = null, prnt = null, cssClass = '__iconSepWin';
	this.position = { left: 0, top: 0, vert: true };
	function enter() {
		Observer.disconnectDomChange();
		__Element.switchOn(trgt);
	}
	function leave() {
		__Element.switchOff();
		Observer.domChange();
	}
	function calZindex() {
		var parent = trgt;
		var zIndex = 0;
		var tmp = 0;
		while (parent.tagName !== 'BODY') {
			tmp = parseFloat(window.getComputedStyle(parent).zIndex);
			if (tmp && tmp > zIndex) {
				zIndex = tmp;
			}
			parent = parent.parentNode;
		}
		if (zIndex > 0) icon.style.zIndex = zIndex;
	}
	function create() {
		trgt = target;
		icon = document.createElement('div');
		icon.classList.add(cssClass);
		icon.setAttribute('title', chrome.i18n.getMessage('titleIcon'));
		icon.addEventListener('mouseenter', enter.bind(this));
		icon.addEventListener('mouseleave', leave.bind(this));
		calZindex();
	}
	function move(pos) {
		var dt = 0, dl = 0;
		if (prnt.style.position == 'fixed') {
			var rect = document.body.getBoundingClientRect();
			dt = 0 - Math.round(rect.top);
			dl = 0 - Math.round(rect.left);
		}
		icon.style.top = Math.round(pos.top) + dt + 'px';
		icon.style.left = Math.round(pos.left) + dl + 'px';
	}
	function paste(parent) {
		if (icon) {
			parent.appendChild(icon);
			prnt = parent;
		}
	}
	create();
	this.click = function (e) {
		e.preventDefault();
		e.stopImmediatePropagation();
		__Element.switchOff();
		__AppPanel.apply(trgt);
	};
	this.isIcon = function (elem) {
		return icon == elem;
	};
	this.delete = function () {
		if (prnt) { prnt.removeChild(icon); }
	};
	this.checkPosition = function (pos) {
		if (Math.abs(pos.left - this.position.left) < 22 && Math.abs(pos.top - this.position.top) < 20) {
			this.position.vert ? this.position.top = pos.top + 22 : this.position.left = pos.left + 24;
		}
	};
	this.checkTarget = function () {
		if ('offsetParent' in trgt) {
			return !!trgt.offsetParent;
		} else {
			if (trgt.parentNode) {
				return !!trgt.parentNode.offsetParent;
			} else {
				return !!trgt.parentNode;
			}
		}
	};
	this.checkVisible = function () { return (this.position.top >= window.pageYOffset && this.position.top <= (window.innerHeight + window.pageYOffset) && this.position.left >= window.pageXOffset); };
	this.setPosition = function () {
		if (!prnt) { paste(document.body); }
		move(this.position);
	};
	this.getPosition = function () {
		var size = trgt.getBoundingClientRect(), top = size.top, left = size.left;
		if (left < 22) {
			top -= 20;
			this.position.vert = false;
		} else {
			left -= 22;
			this.position.vert = true;
		}
		this.position.top = top + window.pageYOffset;
		this.position.left = left + window.pageXOffset;
		return this.position;
	};
	this.getTrgt = function () {
		return trgt;
	};
}