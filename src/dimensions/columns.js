Monocle.Dimensions.Columns = function (pageDiv) {

  var API = { constructor: Monocle.Dimensions.Columns }
  var k = API.constants = API.constructor;
  var p = API.properties = {
    page: pageDiv,
    reader: pageDiv.m.reader,
    dirty: true
  }


  function initialize() {
    p.reader.listen('monocle:componentchange', componentChanged);
  }


  function hasChanged() {
    if (p.dirty) { return true; }
    var newMeasurements = rawMeasurements();
    return (
      (!p.measurements) ||
      (p.measurements.width != newMeasurements.width) ||
      (p.measurements.height != newMeasurements.height) ||
      (p.measurements.scrollWidth != newMeasurements.scrollWidth) ||
      (p.measurements.fontSize != newMeasurements.fontSize)
    );
  }


  function measure() {
    setColumnWidth();
    p.measurements = rawMeasurements();
    // TODO: detect singe-page components.
    p.length = Math.ceil(p.measurements.scrollWidth / p.measurements.width);
    console.log('page['+p.page.m.pageIndex+'] -> '+p.length);
    p.dirty = false;
    return p.length;
  }


  function pages() {
    if (p.dirty) {
      console.warn('Accessing pages() when dimensions are dirty.')
      return 0;
    }
    return p.length;
  }


  function percentageThroughOfId(id) {
    var scroller = scrollerElement();
    var oldScrollLeft = scroller.scrollLeft;
    var doc = page.m.activeFrame.contentDocument;
    var target = doc.getElementById(id);
    while (target && target.parentNode != doc.body) {
      target = target.parentNode;
    }
    var percent = 0;
    if (target) {
      target.scrollIntoView();
      percent = scroller.scrollLeft / p.measurements.scrollWidth;
    }
    scroller.scrollTop = 0;
    scroller.scrollLeft = oldScrollLeft;
    return percent;
  }


  function componentChanged(evt) {
    if (evt.m['page'] != p.page) { return; }
    var doc = evt.m['document'];
    Monocle.Styles.applyRules(doc.body, k.BODY_STYLES);

    // BROWSERHACK: WEBKIT bug - iframe needs scrollbars explicitly disabled.
    if (Monocle.Browser.is.WebKit) {
      doc.documentElement.style.overflow = 'hidden';
    }
    p.dirty = true;
  }


  function setColumnWidth() {
    var cw = p.page.m.sheafDiv.clientWidth;
    var doc = p.page.m.activeFrame.contentDocument;
    if (currBodyStyleValue('column-width') != cw+"px") {
      Monocle.Styles.affix(doc.body, 'column-width', cw+"px");
      p.dirty = true;
    }
  }


  function rawMeasurements() {
    var sheaf = p.page.m.sheafDiv;
    return {
      width: sheaf.clientWidth,
      height: sheaf.clientHeight,
      scrollWidth: scrollerWidth(),
      fontSize: currBodyStyleValue('font-size')
    }
  }


  // Returns the element that is offset to the left in order to display
  // a particular page.
  //
  // This is a BROWSERHACK:
  //   iOS devices don't allow scrollbars on the frame itself.
  //   This means that it's the parent div that must be scrolled -- the sheaf.
  //
  function scrollerElement() {
    var bdy = p.page.m.activeFrame.contentDocument.body;

    if (Monocle.Browser.has.iframeWidthBug) {
      var oldSL = bdy.scrollLeft;
      var sl = bdy.scrollLeft = bdy.scrollWidth;
      var bodyScroller = (bdy.scrollLeft != 0);
      bdy.scrollLeft = oldSL;
      return bodyScroller ? bdy : p.page.m.sheafDiv;
    } else {
      return bdy;
    }
  }


  // Returns the width of the offsettable area of the scroller element. By
  // definition, the number of pages is always this number divided by the
  // width of a single page (eg, the client area of the scroller element).
  //
  // BROWSERHACK:
  //
  // iOS 4+ devices sometimes report incorrect scrollWidths.
  //  1) The body scrollWidth is now always 2x what it really is.
  //  2) The sheafDiv scrollWidth is sometimes only 2x page width, despite
  //    body being much bigger.
  //
  // In Gecko browsers, translating X on the document body causes the
  // scrollWidth of the body to change. (I think this is a bug.) Hence, we
  // have to find the last element in the body, and get the 'right' value from
  // its bounding rect.
  //
  // In other browsers, we can just use the scrollWidth of the scrollerElement.
  //
  function scrollerWidth() {
    var bdy = p.page.m.activeFrame.contentDocument.body;
    if (Monocle.Browser.has.iframeWidthBug) {
      if (Monocle.Browser.iOSVersion < "4.1") {
        var hbw = bdy.scrollWidth / 2;
        var sew = scrollerElement().scrollWidth;
        return Math.max(sew, hbw);
      } else {
        bdy.scrollWidth; // Throw one away. WTF!
        var hbw = bdy.scrollWidth / 2;
        //console.log(p.id + ": " + hbw + "px");
        return hbw;
      }
    } else if (Monocle.Browser.is.Gecko) {
      var lc = bdy.lastChild;
      while (lc && lc.nodeType != 1) {
        lc = lc.previousSibling;
      }
      if (lc && lc.getBoundingClientRect) {
        return lc.getBoundingClientRect().right;
      }
    }
    return scrollerElement().scrollWidth;
  }


  function currBodyStyleValue(property) {
    var win = p.page.m.activeFrame.contentWindow;
    var doc = win.document;
    var currStyle = win.getComputedStyle(doc.body, null);
    return currStyle.getPropertyValue(property);
  }


  function locusToOffset(locus) {
    return 0 - (p.measurements.width * (locus.page - 1));
  }


  function translateToLocus(locus) {
    var offset = locusToOffset(locus);
    var bdy = p.page.m.activeFrame.contentDocument.body;
    Monocle.Styles.affix(bdy, "transform", "translateX("+offset+"px)");
    return offset;
  }


  API.hasChanged = hasChanged;
  API.measure = measure;
  API.pages = pages;
  API.percentageThroughOfId = percentageThroughOfId;

  API.locusToOffset = locusToOffset;
  API.translateToLocus = translateToLocus;

  initialize();

  return API;
}


Monocle.Dimensions.Columns.BODY_STYLES = {
  "position": "absolute",
  "height": "100%",
  "min-width": "200%",
  "-webkit-column-gap": "0",
  "-webkit-column-fill": "auto",
  "-moz-column-gap": "0",
  "-moz-column-fill": "auto",
  "column-gap": "0",
  "column-fill": "auto"
}
