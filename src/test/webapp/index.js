
$(function() {

  var $grid = jscoregrid.create();
  var gridModel = $grid.data('model');

  // defines large table
  gridModel.getRowCount = function() { return 100000; };
  gridModel.getColCount = function() { return 100000; };

  gridModel.setHeadPosition(2, 1);
  gridModel.setLockPosition(2, 1);
//    gridModel.setLockPosition(3, 2);

  gridModel.setCellValueAt(6, 6, 'SPANED');
  gridModel.setCellStyleAt(6, 6, {
    colspan : 3, rowspan : 2,
    textAlign : 'right',
    color : '#ff0000', backgroundColor : '#ffff00'
  });

  var bgColor = '#0000cc';
  var color = '#ffff00';

  gridModel.setCellValueAt(0, 1, 'Group0');
  gridModel.setCellStyleAt(0, 1, {
    colspan : 3, rowspan : 2,
    textAlign : 'center',
    color : color, backgroundColor : bgColor,
    editable : false
  });

  gridModel.setCellValueAt(0, 4, 'Group1');
  gridModel.setCellStyleAt(0, 4, {
    colspan : 2,
    textAlign : 'left',
    color : color, backgroundColor : bgColor,
    editable : false
  });

  gridModel.setCellValueAt(0, 6, 'Group2');
  gridModel.setCellStyleAt(0, 6, {
    colspan : 4,
    textAlign : 'left',
    color : color, backgroundColor : bgColor,
    editable : false
  });

  for (var i = 0; i < 6; i += 1) {
    var val = '#' + (i + 1);
    var cs = {
        textAlign : 'center',
        color : color, backgroundColor : bgColor,
        editable : false
      };
    if (i == 0 || i == 2) {
      val = '';
      cs.borderTop = 'none';
    }
    gridModel.setCellValueAt(1, 4 + i, val);
    gridModel.setCellStyleAt(1, 4 + i, cs);
  }

  gridModel.setCellWidthAt(10, 120);
  gridModel.setCellValueAt(0, 10, 'NumColumn');
  gridModel.setCellStyleAt(0, 10, {
    backgroundColor: '#ff00cc', rowspan : 2, verticalAlign : 'middle', fontWeight:'bold' });
  var getCellStyleAt = gridModel.getCellStyleAt;
  gridModel.getCellStyleAt = function(row, col) {
    if (col == 10 && row >= 2) {
      return numberStyle;
    }
    return getCellStyleAt(row, col);
  };

  var numberStyle = {
      textAlign : 'right',
      html : function(val) {
        if (val == null) {
          return '';
        } else if (!val.match(/^\-?\d*$/) ) {
          return 'NaN';
        }
        var neg = val.indexOf('-') == 0;
        if (neg) {
          val = val.substring(1);
        }
        var f = '';
        while (val.length > 0) {
          if (val.length > 3) {
            f = ',' + val.substring(val.length - 3) + f;
            val = val.substring(0, val.length - 3);
          } else {
            f = val + f;
            val = '';
          }
        }
        return neg? '<span style="color:red">-' + f  + '</span>' : f;
      },
      format : function(val) {
        return val != null? val : '';
      },
      parse : function(s) {
         s = toAscii(s).replace(/,/g, '');
         return s.length > 0? s : null;
      }
    };

  var wide = '―，０１２３４５６７８９';
  var ascii = '-,0123456789';
  var toAscii = function(s) {
    var a = '';
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charAt(i);
      var index = wide.indexOf(c);
      if (index != -1) {
        a += ascii.charAt(index);
      } else {
        a += c;
      }
    }
    return a;
  };

  $('HEAD').append($('<style type="text/css"></style>').
      text('.' + jscoregrid.editorClass + '::-ms-clear{display:none};') );
  $('BODY').append($grid);

  $('BODY').css({padding:'0px', margin:'0px', overflow: 'hidden'});
  $(window).on('resize', function(event) {
    gridModel.width = $(this).width();
    gridModel.height = $(this).height();
    gridModel.invalidate();
  }).trigger('resize');

  //gridModel.invalidate();
});
