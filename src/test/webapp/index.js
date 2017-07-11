
'use strict';

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
    color : color, backgroundColor : bgColor
  });

  gridModel.setCellValueAt(0, 4, 'Group1');
  gridModel.setCellStyleAt(0, 4, {
    colspan : 2,
    textAlign : 'left',
    color : color, backgroundColor : bgColor
  });

  gridModel.setCellValueAt(0, 6, 'Group2');
  gridModel.setCellStyleAt(0, 6, {
    colspan : 4,
    textAlign : 'left',
    color : color, backgroundColor : bgColor
  });

  for (var i = 0; i < 6; i += 1) {
    var val = '#' + (i + 1);
    var cs = {
        textAlign : 'center',
        color : color, backgroundColor : bgColor
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
    backgroundColor: '#ff00cc', rowspan : 2,
    verticalAlign : 'middle', fontWeight:'bold' });
  var getCellStyleAt = gridModel.getCellStyleAt;
  gridModel.getCellStyleAt = function(row, col) {
    if (col == 10 && row >= 2) {
      numberStyle.editable = row >= 3;
      return numberStyle;
    }
    return getCellStyleAt(row, col);
  };

  gridModel.setCellValueAt(2, 9, 'SUM:');
  gridModel.setCellStyleAt(2, 9, {
    colspan : 1,
    textAlign : 'right',
    backgroundColor : '#00ffcc',
    editable : false
  });

  $grid.on('valuechange', function(event, data) {
    var sum = 0;
    gridModel.forEachCell(function(cell) {
      if (cell.col == 10 && cell.row >= 3) {
        sum += +cell.value;
      }
    });
    gridModel.setCellValueAt(2, 10, '' + sum);
  });

  var numberStyle = {
    textAlign : 'right',
    maxLength : 15 + 1,
    formatter : {
      html : function(value) {
        if (value == null) {
          return '';
        } else if (!value.match(/^\-?\d*$/) ) {
          return '<span style="color:red;">NaN</span>';
        }
        var neg = value.indexOf('-') == 0;
        if (neg) {
          value = value.substring(1);
        }
        if (value.length >= numberStyle.maxLength - 1) {
          value = value.substring(0, numberStyle.maxLength - 1);
        }
        // trim leading zero.
        while (value.length > 1 && value.indexOf(0) == '0') {
          value = value.substring(1);
        }
        if (value == '0') {
          // not negative.
          neg = false;
        }
        var f = '';
        while (value.length > 0) {
          if (value.length > 3) {
            f = ',' + value.substring(value.length - 3) + f;
            value = value.substring(0, value.length - 3);
          } else {
            f = value + f;
            value = '';
          }
        }
        return neg? '<span style="color:red">-' + f  + '</span>' : f;
      },
      format : function(value) {
        return value != null? value : '';
      },
      parse : function(s) {
         s = toAscii(s);
         return s.length > 0? s : null;
      }
    }
  };

  var toAscii = function() {
    var wide = '＋―，．０１２３４５６７８９';
    var ascii = '+-,.0123456789';
    return function(s) {
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
  }();

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
