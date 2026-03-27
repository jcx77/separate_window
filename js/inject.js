// inject.js - 重写 removeChild 方法以保护分离窗口的元素不被删除
(function() {
	// 保存原始 removeChild
	Element.prototype["swRemCh"] = Element.prototype.removeChild;
	Element.prototype.removeChild = function(elem) {
		if (elem.classList && (elem.classList.contains("__parent") || elem.classList.contains("__target"))) {
			if (elem.hasAttribute("src") && elem.getAttribute("src") == "") {
				elem.parentNode.swRemCh(elem);
				return;
			}
			if (document.hasOwnProperty("swRemoval")) {
				if (document.swRemoval.indexOf(elem) == -1) document.swRemoval.push(elem);
			} else {
				document["swRemoval"] = [];
				document.swRemoval.push(elem);
			}
		} else {
			Element.prototype.swRemCh.apply(this, [elem]);
		}
	};
})();