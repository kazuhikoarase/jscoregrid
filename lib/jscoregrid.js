//
// jscoregrid
//
// Copyright (c) 2017 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
'use strict';
var jscoregrid;
(function (jscoregrid) {
    var debug = location.hash == '#debug';
    var logger = {
        debug: function (msg) {
        }
    };
    if (debug) {
        logger.debug = function (msg) {
            console.log(msg);
        };
    }
    var prefix = 'jscoregrid';
    var currentSelectionClass = prefix + '-current-selection';
    var copySelectionClass = prefix + '-copy-selection';
    var resizeBarClass = prefix + '-resize-bar';
    jscoregrid.editorClass = prefix + '-editor';
    jscoregrid.create = function (opts) {
        var style = {
            padding: 2,
            fontFamily: '"Meiryo UI", arial, sans-serif',
            fontSize: '10px',
            borderWidth: 1,
            borderColor: '#cccccc',
            lockBorderColor: '#999999',
            selectionBorderWidth: 2,
            selectionBorderColor: '#000000',
            selectionBackgroundColor: '#0000ff',
            selectionBackgroundOpacity: 0.1,
            selectionRCBackgroundColor: '#ffcc00',
            selectionRCBackgroundOpacity: 0.1,
            resizeAnchorWidth: 3,
            resizeBarWidth: 0,
            resizeBarColor: '#666666',
            resizeBarStyle: 'dotted'
        };
        if (opts && opts.style) {
            style = $.extend(style, opts.style);
        }
        if (debug) {
            style.padding = 3;
            style.borderWidth = 7;
            style.borderColor = '#00ff99';
            style.selectionBorderWidth = 5;
            style.selectionBorderColor = '#0099ff';
        }
        var cellPadding = style.padding * 2 + style.borderWidth;
        var labelCss = createSet([
            'width', 'height',
            'color',
            'textAlign',
            'fontFamily', 'fontSize', 'fontWeight',
            'cursor'
        ]);
        var editorCss = createSet([
            'width', 'height',
            'color', 'backgroundColor',
            'textAlign',
            'fontFamily', 'fontSize', 'fontWeight'
        ]);
        var cellCss = createSet([
            'borderTop', 'borderLeft', 'backgroundColor'
        ]);
        var cellAttr = createSet(['colspan', 'rowspan']);
        // internal only
        var resizeUIOpacity = debug ? 0.5 : 0;
        var resizeUIColor = '#000000';
        var createCell = function () {
            var cache = createCache();
            var cellModel = {
                col: -1, row: -1,
                setSelectedColor: function (selectedColor, opacity) {
                    cache.data({
                        selectedColor: selectedColor,
                        selectedOpacity: selectedColor != null ? opacity : 0
                    }, function (k, v) {
                        if (k == 'selectedColor') {
                            $selection.css('background-color', v);
                        }
                        else if (k == 'selectedOpacity') {
                            $selection.css('opacity', v);
                        }
                    });
                },
                setCellValue: function (value) {
                    cache.data({ value: value }, function (k, v) {
                        $label.html(v);
                    });
                },
                setCellStyle: function (cs) {
                    cellModel.row = cs.row;
                    cellModel.col = cs.col;
                    cache.data(cs, function (k, v) {
                        if (labelCss[k]) {
                            $label.css(k, v);
                            if (k == 'height') {
                                $label.css('line-height', v);
                            }
                        }
                        else if (cellCss[k]) {
                            $cell.css(k, v);
                        }
                        else if (cellAttr[k]) {
                            $cell.attr(k, v);
                        }
                    });
                }
            };
            var $selection = $('<span></span>').css({
                position: 'absolute', pointerEvents: 'none',
                left: '0px', top: '0px', right: '0px', bottom: '0px'
            });
            var $label = $('<span></span>').css({
                display: 'block', whiteSpace: 'nowrap',
                overflow: 'hidden', padding: style.padding + 'px' });
            var $cell = $('<td></td>').
                css({ padding: '0px', margin: '0px', position: 'relative' }).
                data('model', cellModel).append($label).append($selection);
            return $cell;
        };
        var createInnerTable = function () {
            var rows = [];
            var cols = [];
            var cells = [];
            var colCount = 0;
            var rowCount = 0;
            var appendCell = function (r) {
                var $cell = createCell();
                rows[r].append($cell);
                cells[r].push({ $ui: $cell, model: $cell.data('model') });
            };
            var addRow = function () {
                var $row = $('<tr></tr>');
                rows.push($row);
                cells.push([]);
                $tbody.append($row);
                var r = cells.length - 1;
                for (var c = 0; c < colCount; c += 1) {
                    appendCell(r);
                }
                rowCount += 1;
            };
            var addCol = function () {
                var $col = $('<col></col>');
                $colgroup.append($col);
                cols.push($col);
                for (var r = 0; r < rowCount; r += 1) {
                    appendCell(r);
                }
                colCount += 1;
            };
            var tableModel = {
                getRowCount: function () {
                    return rowCount;
                },
                getColCount: function () {
                    return colCount;
                },
                getColAt: function (c) {
                    return cols[c];
                },
                getCellAt: function (r, c) {
                    while (rowCount <= r) {
                        addRow();
                    }
                    while (colCount <= c) {
                        addCol();
                    }
                    return cells[r][c].$ui;
                },
                getCellModelAt: function (r, c) {
                    while (rowCount <= r) {
                        addRow();
                    }
                    while (colCount <= c) {
                        addCol();
                    }
                    return cells[r][c].model;
                }
            };
            var $colgroup = $('<colgroup></colgroup>');
            var $tbody = $('<tbody></tbody>');
            return $('<table></table>').css({
                position: 'absolute',
                tableLayout: 'fixed',
                borderCollapse: 'separate',
                border: 'none'
            }).attr({ cellspacing: '0' }).data('model', tableModel).
                append($colgroup).append($tbody);
        };
        var createSelectionBorder = function (className) {
            return createPane().addClass(className).css({
                display: 'none', pointerEvents: 'none' }).
                append(createPane().css({
                border: style.selectionBorderWidth + 'px solid ' +
                    style.selectionBorderColor,
                top: '0px', bottom: '0px', left: '0px', right: '0px' }));
        };
        var resizeRow = function (row, height) {
            var found = false;
            for (var i = 0; i < selections.length; i += 1) {
                var selection = selections[i];
                if (selection.mode == 'row' &&
                    selection.getRange().contains(row, 0)) {
                    found = true;
                }
            }
            if (found) {
                for (var i = 0; i < selections.length; i += 1) {
                    var selection = selections[i];
                    if (selection.mode == 'row') {
                        var range = selection.getRange();
                        for (var r = range.minRow; r <= range.maxRow; r += 1) {
                            gridModel.setCellHeightAt(r, height);
                        }
                    }
                }
            }
            else {
                gridModel.setCellHeightAt(row, height);
            }
        };
        var resizeCol = function (col, width) {
            var found = false;
            for (var i = 0; i < selections.length; i += 1) {
                var selection = selections[i];
                if (selection.mode == 'col' &&
                    selection.getRange().contains(0, col)) {
                    found = true;
                }
            }
            if (found) {
                for (var i = 0; i < selections.length; i += 1) {
                    var selection = selections[i];
                    if (selection.mode == 'col') {
                        var range = selection.getRange();
                        for (var c = range.minCol; c <= range.maxCol; c += 1) {
                            gridModel.setCellWidthAt(c, width);
                        }
                    }
                }
            }
            else {
                gridModel.setCellWidthAt(col, width);
            }
        };
        var doResize = function (event, $resize) {
            var resizeModel = $resize.data('model');
            var target = resizeModel.target;
            var mousemoveHandler = function (event) {
                if (target == 'row') {
                    $resizeBar.css({
                        top: (barPos.top + event.pageY - dragPoint.y) + 'px'
                    });
                }
                else if (target == 'col') {
                    $resizeBar.css({
                        left: (barPos.left + event.pageX - dragPoint.x) + 'px'
                    });
                }
            };
            var mouseupHandler = function (event) {
                $(document).off('mousemove', mousemoveHandler).
                    off('mouseup', mouseupHandler);
                $block.remove();
                $resizeBar.css({ display: 'none' });
                var dx = event.pageX - dragPoint.x;
                var dy = event.pageY - dragPoint.y;
                if (target == 'row' && dy != 0) {
                    resizeRow(resizeModel.row, gridModel.getCellHeightAt(resizeModel.row) + dy);
                }
                else if (target == 'col' && dx != 0) {
                    resizeCol(resizeModel.col, gridModel.getCellWidthAt(resizeModel.col) + dx);
                }
            };
            $(document).on('mousemove', mousemoveHandler).
                on('mouseup', mouseupHandler);
            var dragPoint = { x: event.pageX, y: event.pageY };
            var attr = attrs[2][2];
            var width = attr.paneRect.left + attr.paneRect.width - style.resizeBarWidth;
            var height = attr.paneRect.top + attr.paneRect.height - style.resizeBarWidth;
            var $block = createPane().css({
                left: '0px',
                top: '0px',
                width: width + 'px',
                height: height + 'px',
                backgroundColor: resizeUIColor,
                opacity: resizeUIOpacity,
                cursor: target + '-resize' });
            $grid.append($block);
            var barPos = {
                left: target == 'col' ? resizeModel.left - style.resizeBarWidth : 0,
                top: target == 'row' ? resizeModel.top - style.resizeBarWidth : 0
            };
            $resizeBar.css({
                display: '',
                left: barPos.left + 'px', top: barPos.top + 'px',
                width: (target == 'row' ? width - 1 : 0) + 'px',
                height: (target == 'col' ? height - 1 : 0) + 'px',
            });
        };
        var createRange = function (minRow, maxRow, minCol, maxCol) {
            return {
                minRow: minRow,
                maxRow: maxRow,
                minCol: minCol,
                maxCol: maxCol,
                contains: function (row, col) {
                    return minRow <= row && row <= maxRow &&
                        minCol <= col && col <= maxCol;
                },
                containsRange: function (range) {
                    return minRow <= range.minRow && range.maxRow <= maxRow &&
                        minCol <= range.minCol && range.maxCol <= maxCol;
                }
            };
        };
        var createSelection = function (row, col) {
            var headPosition = getHeadPosition();
            var mode;
            if (row < headPosition.row && col < headPosition.col) {
                mode = 'all';
            }
            else if (row < headPosition.row) {
                mode = 'col';
            }
            else if (col < headPosition.col) {
                mode = 'row';
            }
            else {
                mode = 'cells';
            }
            var r1 = row;
            var c1 = col;
            var r2 = row;
            var c2 = col;
            var valid = false;
            var minRow;
            var maxRow;
            var minCol;
            var maxCol;
            var validate = function () {
                if (valid) {
                    return;
                }
                var cell1 = getMergedCellStyleAt(r1, c1);
                var cell2 = getMergedCellStyleAt(r2, c2);
                var sr1Min = r1;
                var sr1Max = r1 + cell1.rowspan - 1;
                var sc1Min = c1;
                var sc1Max = c1 + cell1.colspan - 1;
                var sr2Min = r2;
                var sr2Max = r2 + cell2.rowspan - 1;
                var sc2Min = c2;
                var sc2Max = c2 + cell2.colspan - 1;
                minRow = Math.min(sr1Min, sr2Min);
                maxRow = Math.max(sr1Max, sr2Max);
                minCol = Math.min(sc1Min, sc2Min);
                maxCol = Math.max(sc1Max, sc2Max);
                if (mode == 'all') {
                    minRow = 0;
                    maxRow = gridModel.getRowCount();
                    minCol = 0;
                    maxCol = gridModel.getColCount();
                }
                else if (mode == 'col') {
                    minRow = 0;
                    maxRow = gridModel.getRowCount();
                }
                else if (mode == 'row') {
                    minCol = 0;
                    maxCol = gridModel.getColCount();
                }
                valid = true;
            };
            return {
                mode: mode,
                getRow: function () { return r2; },
                getCol: function () { return c2; },
                update: function (row, col) {
                    if (r2 != row || c2 != col) {
                        r2 = row;
                        c2 = col;
                        valid = false;
                        return true;
                    }
                    return false;
                },
                getRange: function () {
                    validate();
                    return createRange(minRow, maxRow, minCol, maxCol);
                }
            };
        };
        var selections = [];
        var selectStart = function (row, col, append) {
            if (append === void 0) { append = false; }
            if (!append) {
                selections = [];
            }
            selections.push(createSelection(row, col));
        };
        var $grid = createDiv().css({ position: 'relative' }).
            on('mousedown', function (event) {
            var $resize = $(event.target).closest('.' + resizeBarClass);
            if ($resize.length == 1) {
                event.preventDefault();
                doResize(event, $resize);
                logger.debug('#1');
                return;
            }
            var $cell = $(event.target).closest('TD');
            if ($cell.length != 1) {
                return;
            }
            event.preventDefault();
            commitEdit();
            var cellModel = $cell.data('model');
            var headPosition = getHeadPosition();
            selectStart(cellModel.row, cellModel.col, event.ctrlKey || event.metaKey);
            if (cellModel.row < headPosition.row &&
                cellModel.col < headPosition.col) {
                // select all
                beginEdit(headPosition.row, headPosition.col);
            }
            else if (cellModel.row < headPosition.row) {
                // select col
                beginEdit(headPosition.row, cellModel.col);
            }
            else if (cellModel.col < headPosition.col) {
                // select row
                beginEdit(cellModel.row, headPosition.col);
            }
            else {
                // select range
                beginEdit(cellModel.row, cellModel.col);
            }
            var mousemoveHandler = function (event) {
                var $cell = $(event.target).closest('TD');
                if ($cell.length != 1) {
                    return;
                }
                if (selections.length == 0) {
                    return;
                }
                var selection = selections[selections.length - 1];
                var cellModel = $cell.data('model');
                var row = cellModel.row;
                var col = cellModel.col;
                if (selection.mode == 'all') {
                }
                else if (selection.mode == 'row') {
                    row = Math.max(headPosition.row, row);
                }
                else if (selection.mode == 'col') {
                    col = Math.max(headPosition.col, col);
                }
                else {
                    row = Math.max(headPosition.row, row);
                    col = Math.max(headPosition.col, col);
                }
                if (selection.update(row, col)) {
                    makeVisible(row, col);
                    gridModel.invalidate();
                }
            };
            var mouseupHandler = function (event) {
                $(document).off('mousemove', mousemoveHandler).
                    off('mouseup', mouseupHandler);
            };
            $(document).on('mousemove', mousemoveHandler).
                on('mouseup', mouseupHandler);
        }).on('wheel', function (event) {
            event.preventDefault();
            var oe = event.originalEvent;
            $scr.scrollLeft($scr.scrollLeft() + oe.deltaX);
            $scr.scrollTop($scr.scrollTop() + oe.deltaY);
        });
        var getFontMetrics = function () {
            var $dummy = $('<div></div>').css({
                position: 'absolute', display: 'none',
                fontFamily: style.fontFamily,
                fontSize: style.fontSize });
            $grid.append($dummy);
            return function (text) {
                $dummy.text(text);
                return {
                    width: $dummy.width(),
                    height: $dummy.height()
                };
            };
        }();
        var $scr = createPane(true).on('scroll', function (event) {
            gridModel.invalidate();
        });
        var $scrPane = createPane();
        $scr.append($scrPane);
        $grid.append($scr);
        var panes = [];
        var attrs = [];
        !function () {
            for (var r = 0; r < 3; r += 1) {
                panes.push([]);
                attrs.push([]);
                for (var c = 0; c < 3; c += 1) {
                    var $pane = createPane().append(createInnerTable());
                    $grid.append($pane);
                    panes[r].push($pane);
                    attrs[r].push({});
                }
            }
        }();
        var $vLockLine = createPane().
            css('border-left', style.borderWidth + 'px solid ' + style.lockBorderColor);
        var $hLockLine = createPane().
            css('border-top', style.borderWidth + 'px solid ' + style.lockBorderColor);
        var $rLine = createPane().
            css('border-left', style.borderWidth + 'px solid ' + style.borderColor);
        var $bLine = createPane().
            css('border-top', style.borderWidth + 'px solid ' + style.borderColor);
        $grid.append($vLockLine).append($hLockLine).append($rLine).append($bLine);
        var makeVisible = function (row, col) {
            var lockPosition = getLockPosition();
            var gap = 8;
            if (lockPosition.row <= row) {
                var top = 0;
                var height = gridModel.getCellHeightAt(row) + style.borderWidth;
                var ph = panes[2][2].height();
                for (var r = lockPosition.row; r < row; r += 1) {
                    top += gridModel.getCellHeightAt(r) + cellPadding;
                }
                if ($scr.scrollTop() > top) {
                    $scr.scrollTop(top - gap);
                }
                else if ($scr.scrollTop() + ph < top + height + cellPadding) {
                    $scr.scrollTop(top + height + cellPadding - ph + gap);
                }
            }
            if (lockPosition.col <= col) {
                var left = 0;
                var width = gridModel.getCellWidthAt(col) + style.borderWidth;
                var pw = panes[2][2].width();
                for (var c = lockPosition.col; c < col; c += 1) {
                    left += gridModel.getCellWidthAt(c) + cellPadding;
                }
                if ($scr.scrollLeft() > left) {
                    $scr.scrollLeft(left - gap);
                }
                else if ($scr.scrollLeft() + pw < left + width + cellPadding) {
                    $scr.scrollLeft(left + width + cellPadding - pw + gap);
                }
            }
        };
        var beginEdit = function (row, col) {
            makeVisible(row, col);
            var cs = getMergedCellStyleAt(row, col);
            var css = {};
            for (var k in cs) {
                if (editorCss[k]) {
                    css[k] = cs[k];
                }
            }
            var editorModel = $editor.data('model');
            editorModel.row = row;
            editorModel.col = col;
            editorModel.css = css;
            editorModel.invalidate();
            gridModel.invalidate();
        };
        var commitEdit = function () {
            var editorModel = $editor.data('model');
            if (!editorModel.isValid()) {
                return;
            }
            var cs = getMergedCellStyleAt(editorModel.row, editorModel.col);
            var value = editorModel.getValue();
            if (value.length > cs.maxLength) {
                value = value.substring(0, cs.maxLength);
                editorModel.setValue(value);
            }
            gridModel.setCellValueAt(editorModel.row, editorModel.col, cs.formatter.parse(value));
        };
        var cancelEdit = function () {
            copySelection = null;
            var editorModel = $editor.data('model');
            beginEdit(editorModel.row, editorModel.col);
        };
        var copy = function (selection) {
            var range = selection.getRange();
            var csv = '';
            for (var r = range.minRow; r <= range.maxRow; r += 1) {
                for (var c = range.minCol; c <= range.maxCol; c += 1) {
                    if (c > range.minCol) {
                        csv += '\t';
                    }
                    var cs = getMergedCellStyleAt(r, c);
                    csv += quote(cs.formatter.format(getMergedCellValueAt(r, c)));
                }
                csv += '\n';
            }
            var $tmp = $('<textarea></textarea>').val(csv);
            $grid.append($tmp);
            $tmp.select();
            document.execCommand('copy');
            $tmp.remove();
        };
        var erase = function (selection) {
            var range = selection.getRange();
            for (var r = range.minRow; r <= range.maxRow; r += 1) {
                for (var c = range.minCol; c <= range.maxCol; c += 1) {
                    if (gridModel.isCellEditableAt(r, c)) {
                        gridModel.setCellValueAt(r, c, null);
                    }
                }
            }
        };
        var updateCopySelection = function () {
            var active = false;
            var index = 0;
            var colors = [style.selectionBorderColor, '#ffffff'];
            var updateSelection = function (r, c) {
                var $b = panes[r][c].children('.' + copySelectionClass);
                if ($b.children().length == 1) {
                    $b.append($b.children().clone());
                }
                $b.children().each(function () {
                    var w = style.selectionBorderWidth - 1;
                    var color = colors[($(this).index() + index) % colors.length];
                    if ($(this).index() == 0) {
                        $(this).css({ border: w + 'px solid ' + color, margin: '1px' });
                    }
                    else {
                        $(this).css({ border: w + 'px dashed ' + color, margin: '1px' });
                    }
                });
            };
            var update = function () {
                for (var r = 0; r < 3; r += 1) {
                    for (var c = 0; c < 3; c += 1) {
                        updateSelection(r, c);
                    }
                }
                if (copySelection != null) {
                    index = (index + 1) % 2;
                    window.setTimeout(update, 200);
                }
                else {
                    active = false;
                }
            };
            return function () {
                if (!active) {
                    active = true;
                    update();
                }
            };
        }();
        var createEditor = function () {
            var copyType = null;
            var editing = false;
            var valid = false;
            var cache = createCache();
            var editorModel = {
                row: -1,
                col: -1,
                css: {},
                getValue: function () {
                    return $editor.val();
                },
                setValue: function (value) {
                    $editor.val(value);
                },
                isValid: function () {
                    return valid;
                },
                invalidate: function () {
                    valid = false;
                },
                validate: function () {
                    if (valid) {
                        return;
                    }
                    valid = true;
                    editing = false;
                    var cs = getMergedCellStyleAt(editorModel.row, editorModel.col);
                    var value = getMergedCellValueAt(editorModel.row, editorModel.col);
                    editorModel.setValue(cs.formatter.format(value));
                    cache.data(editorModel.css, function (k, v) {
                        $editor.css(k, v);
                    });
                    $editor.focus().select();
                }
            };
            var editor_keydownHandler = function (event) {
                var $editor = $(event.target);
                var editorModel = $editor.data('model');
                var editable = gridModel.isCellEditableAt(editorModel.row, editorModel.col);
                if (event.ctrlKey || event.metaKey) {
                    return;
                }
                var op = null;
                var move = false;
                if (event.keyCode == 113) {
                    // F2
                    if (editable && !editing) {
                        event.preventDefault();
                        editing = true;
                        var val = $editor.val();
                        $editor.val('').val(val);
                        return;
                    }
                }
                else if (event.keyCode == 27) {
                    // esc
                    if (editable) {
                        event.preventDefault();
                        cancelEdit();
                        return;
                    }
                }
                else if (event.keyCode == 46) {
                    // delete
                    if (editable && !editing && selections.length == 1) {
                        event.preventDefault();
                        erase(selections[0]);
                        beginEdit(editorModel.row, editorModel.col);
                        return;
                    }
                }
                else if (event.keyCode == 33) {
                    // pgup
                    $scr.scrollTop($scr.scrollTop() - 100);
                }
                else if (event.keyCode == 34) {
                    // pgdn
                    $scr.scrollTop($scr.scrollTop() + 100);
                }
                else if (event.keyCode == 9) {
                    // tab
                    op = event.shiftKey ? 'left' : 'right';
                }
                else if (event.keyCode == 13) {
                    // enter
                    if (event.altKey) {
                        event.preventDefault();
                        if (editable && editing) {
                            replaceText($editor[0], '\n');
                        }
                        return;
                    }
                    op = event.shiftKey ? 'up' : 'down';
                }
                if (!editing) {
                    if (event.keyCode == 37) {
                        op = 'left';
                        move = true;
                    }
                    else if (event.keyCode == 38) {
                        op = 'up';
                        move = true;
                    }
                    else if (event.keyCode == 39) {
                        op = 'right';
                        move = true;
                    }
                    else if (event.keyCode == 40) {
                        op = 'down';
                        move = true;
                    }
                }
                if (op == null) {
                    if (!editable) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        return;
                    }
                    var cs = getMergedCellStyleAt(editorModel.row, editorModel.col);
                    var value = editorModel.getValue();
                    if (value.length >= cs.maxLength) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                    }
                    return;
                }
                event.preventDefault();
                commitEdit();
                var row;
                var col;
                var selectionChange = move && event.shiftKey;
                var headPosition = getHeadPosition();
                if (selectionChange) {
                    if (selections.length == 0) {
                        return;
                    }
                    row = selections[selections.length - 1].getRow();
                    col = selections[selections.length - 1].getCol();
                }
                else {
                    row = editorModel.row;
                    col = editorModel.col;
                }
                if (op == 'left') {
                    while (col - 1 >= headPosition.col) {
                        col -= 1;
                        if (!getSpaned(row, col)) {
                            break;
                        }
                    }
                }
                else if (op == 'right') {
                    while (col + 1 <= gridModel.getColCount()) {
                        col += 1;
                        if (!getSpaned(row, col)) {
                            break;
                        }
                    }
                }
                else if (op == 'up') {
                    while (row - 1 >= headPosition.row) {
                        row -= 1;
                        if (!getSpaned(row, col)) {
                            break;
                        }
                    }
                }
                else if (op == 'down') {
                    while (row + 1 <= gridModel.getRowCount()) {
                        row += 1;
                        if (!getSpaned(row, col)) {
                            break;
                        }
                    }
                }
                if (selectionChange) {
                    selections[selections.length - 1].update(row, col);
                    makeVisible(row, col);
                    gridModel.invalidate();
                }
                else {
                    if (editorModel.row != row || editorModel.col != col) {
                        selectStart(row, col);
                        beginEdit(row, col);
                    }
                }
            };
            var $editor = $('<textarea></textarea>').addClass(jscoregrid.editorClass).
                data('model', editorModel).
                css({
                position: 'absolute', overflow: 'hidden',
                border: 'none', outline: 'none', resize: 'none',
                padding: '0px', margin: '0px' }).
                on('keydown', editor_keydownHandler).
                on('mousedown', function (event) {
                editing = true;
            });
            // cut copy paste support.
            $editor.on('keydown cut copy', function (event) {
                if (!editing && selections.length == 1) {
                    if (event.type == 'keydown') {
                        if ((event.keyCode == 67 || event.keyCode == 88) &&
                            (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            if (selections[0].mode != 'cells') {
                                logger.debug('cancel copy:selmode:' + selections[0].mode);
                                return;
                            }
                            var editorModel = $editor.data('model');
                            if (!editorModel.isValid()) {
                                logger.debug('cancel copy:editor is invalid');
                                return;
                            }
                            var cs = getMergedCellStyleAt(editorModel.row, editorModel.col);
                            var value = getMergedCellValueAt(editorModel.row, editorModel.col);
                            var newValue = cs.formatter.parse(editorModel.getValue());
                            if (value != newValue) {
                                logger.debug('cancel copy:editor is dirty');
                                return;
                            }
                            // clone selection
                            var range = selections[0].getRange();
                            copySelection = createSelection(range.minRow, range.minCol);
                            copySelection.update(range.maxRow, range.maxCol);
                            updateCopySelection();
                            copyType = event.keyCode == 67 ? 'copy' : 'cut';
                            copy(selections[0]);
                            $editor.select();
                            gridModel.invalidate();
                        }
                    }
                    else {
                        event.preventDefault();
                    }
                }
            }).
                on('paste', function (event) {
                if (!editing && selections.length == 1) {
                    event.preventDefault();
                    var win = window;
                    var oe = event.originalEvent;
                    var text = null;
                    if (win.clipboardData && win.clipboardData.getData) {
                        text = win.clipboardData.getData('Text');
                    }
                    else if (oe.clipboardData && oe.clipboardData.getData) {
                        text = oe.clipboardData.getData('text/plain');
                    }
                    if (text == null) {
                        return;
                    }
                    if (copySelection != null && copyType == 'cut') {
                        erase(copySelection);
                    }
                    var row = editorModel.row;
                    var col = editorModel.col;
                    var rows = csv_reader.toDataArray(text);
                    for (var r = 0; r < rows.length; r += 1) {
                        var cols = rows[r];
                        for (var c = 0; c < cols.length; c += 1) {
                            if (c == 0) {
                                selections[0].update(row + rows.length - 1, col + cols.length - 1);
                                gridModel.invalidate();
                            }
                            if (!gridModel.isCellEditableAt(row + r, col + c)) {
                                continue;
                            }
                            var cs = getMergedCellStyleAt(row + r, col + c);
                            var value = cs.formatter.parse(cols[c]);
                            if (r == 0 && c == 0) {
                                editorModel.setValue(cs.formatter.format(value));
                            }
                            gridModel.setCellValueAt(row + r, col + c, value);
                        }
                    }
                }
            });
            return $editor;
        };
        var copySelection = null;
        var $editor = createEditor();
        var $editorHolder = createPane().
            on('scroll', function (event) {
            // avoid auto scroll
            $(this).scrollLeft(0).scrollTop(0);
        });
        $grid.append($editorHolder.append($editor));
        var createAnchors = function (cursor) {
            var anchors = [];
            anchors.index = 0;
            anchors.next = function () {
                while (!(anchors.index < anchors.length)) {
                    anchors.push(function () {
                        var $pane = createPane().addClass(resizeBarClass).
                            css({ opacity: resizeUIOpacity,
                            backgroundColor: resizeUIColor,
                            cursor: cursor });
                        $pane.insertAfter($resizeBar);
                        var mcache = createCache();
                        var cache = createCache();
                        var anchor = {
                            model: function (model) {
                                var changed = false;
                                mcache.data(model, function (k, v) {
                                    changed = true;
                                });
                                if (changed) {
                                    $pane.data('model', model);
                                }
                                return anchor;
                            },
                            css: function (css) {
                                cache.data(css, function (k, v) {
                                    $pane.css(k, v);
                                });
                                return anchor;
                            }
                        };
                        return anchor;
                    }());
                }
                return anchors[anchors.index++];
            };
            return anchors;
        };
        var $resizeBar = createPane().css({
            display: 'none',
            borderLeft: (style.resizeBarWidth * 2 + style.borderWidth) + 'px ' +
                style.resizeBarStyle + ' ' + style.resizeBarColor,
            borderTop: (style.resizeBarWidth * 2 + style.borderWidth) + 'px ' +
                style.resizeBarStyle + ' ' + style.resizeBarColor
        });
        $grid.append($resizeBar);
        var colResizeAnchors = createAnchors('col-resize');
        var rowResizeAnchors = createAnchors('row-resize');
        // layout functions.
        var doLayout = function () {
            var calcCellsAttr = function (r, c) {
                var $pane = panes[r][c];
                var attr = attrs[r][c];
                var $cells = $pane.children('TABLE');
                var cellsModel = $cells.data('model');
                var minCol = -1;
                var maxCol = -1;
                var minRow = -1;
                var maxRow = -1;
                var tableRect = { left: -1, top: -1, width: 0, height: 0 };
                !function (c0, x) {
                    var width = attr.paneRect.width;
                    for (var c = c0; c <= colCount && x < width; c += 1) {
                        var w = gridModel.getCellWidthAt(c) + cellPadding;
                        if (x + w > 0) {
                            if (minCol == -1) {
                                tableRect.left = x;
                                minCol = c;
                            }
                            maxCol = c;
                        }
                        x += w;
                    }
                }(c == 0 ? 0 : c == 1 ? headPosition.col : lockPosition.col, c == 2 ? -scrollLeft : 0);
                !function (r0, y) {
                    var height = attr.paneRect.height;
                    for (var r = r0; r <= rowCount && y < height; r += 1) {
                        var h = gridModel.getCellHeightAt(r) + cellPadding;
                        if (y + h > 0) {
                            if (minRow == -1) {
                                tableRect.top = y;
                                minRow = r;
                            }
                            maxRow = r;
                        }
                        y += h;
                    }
                }(r == 0 ? 0 : r == 1 ? headPosition.row : lockPosition.row, r == 2 ? -scrollTop : 0);
                var leading = {
                    row: gridModel.getMaxRowspan() - 1,
                    col: gridModel.getMaxColspan() - 1
                };
                if (minRow - leading.row < 0) {
                    leading.row = minRow;
                }
                if (minCol - leading.col < 0) {
                    leading.col = minCol;
                }
                minRow -= leading.row;
                minCol -= leading.col;
                // calc table size and setup col width.
                !function () {
                    if (!(minRow <= maxRow && minCol <= maxCol)) {
                        return;
                    }
                    cellsModel.getCellAt(maxRow - minRow, maxCol - minCol);
                    for (var r = minRow; r <= maxRow; r += 1) {
                        var height = gridModel.getCellHeightAt(r);
                        tableRect.height += height + cellPadding;
                        if (r < minRow + leading.row) {
                            tableRect.top -= height + cellPadding;
                        }
                    }
                    for (var c = minCol; c <= maxCol; c += 1) {
                        var cCol = c - minCol;
                        var width = gridModel.getCellWidthAt(c);
                        cellsModel.getColAt(cCol).css({
                            width: (width + cellPadding) + 'px' });
                        tableRect.width += width + cellPadding;
                        if (c < minCol + leading.col) {
                            tableRect.left -= width + cellPadding;
                        }
                    }
                }();
                attr.minRow = minRow;
                attr.maxRow = maxRow;
                attr.minCol = minCol;
                attr.maxCol = maxCol;
                attr.tableRect = tableRect;
                attr.leading = leading;
            };
            var layoutResizeAnchors = function (r, c) {
                var attr = attrs[r][c];
                if (c == 0) {
                    var maxTop = attrs[2][2].paneRect.top + attrs[2][2].paneRect.height;
                    for (var row = attr.minRow + attr.leading.row; row <= attr.maxRow; row += 1) {
                        var top = gridModel.calcHeight(attr.minRow, row + 1) +
                            attr.tableRect.top + attr.paneRect.top;
                        if (maxTop < top) {
                            continue;
                        }
                        else if (!gridModel.isCellHeightResizableAt(row)) {
                            continue;
                        }
                        rowResizeAnchors.next().model({ target: 'row', row: row, top: top }).css({
                            display: '',
                            left: '1px', top: (top - style.resizeAnchorWidth) + 'px',
                            width: attr.paneRect.width + 'px',
                            height: (style.resizeAnchorWidth * 2 + style.borderWidth) + 'px' });
                    }
                }
                if (r == 0) {
                    var maxLeft = attrs[2][2].paneRect.left + attrs[2][2].paneRect.width;
                    for (var col = attr.minCol + attr.leading.col; col <= attr.maxCol; col += 1) {
                        var left = gridModel.calcWidth(attr.minCol, col + 1) +
                            attr.tableRect.left + attr.paneRect.left;
                        if (maxLeft < left) {
                            continue;
                        }
                        else if (!gridModel.isCellWidthResizableAt(col)) {
                            continue;
                        }
                        colResizeAnchors.next().model({ target: 'col', col: col, left: left }).css({
                            display: '',
                            left: (left - style.resizeAnchorWidth) + 'px', top: '1px',
                            width: (style.resizeAnchorWidth * 2 + style.borderWidth) + 'px',
                            height: attr.paneRect.height + 'px' });
                    }
                }
            };
            var showSelectionBackground = function (cs, cellModel) {
                var headPosition = getHeadPosition();
                var row = cs.row;
                var col = cs.col;
                var selColor = null;
                var selOpacity = 0;
                for (var i = 0; i < selections.length; i += 1) {
                    var range = selections[i].getRange();
                    if (range.minRow <= row && row + cs.rowspan - 1 <= range.maxRow &&
                        range.minCol <= col && col + cs.colspan - 1 <= range.maxCol) {
                        selColor = style.selectionBackgroundColor;
                        selOpacity = style.selectionBackgroundOpacity;
                        break;
                    }
                }
                if (selColor == null) {
                    for (var i = 0; i < selections.length; i += 1) {
                        if (row < headPosition.row && col < headPosition.col) {
                        }
                        else if (row < headPosition.row) {
                            var range = selections[i].getRange();
                            if (range.minCol <= col &&
                                col + cs.colspan - 1 <= range.maxCol) {
                                selColor = style.selectionRCBackgroundColor;
                                selOpacity = style.selectionRCBackgroundOpacity;
                            }
                        }
                        else if (col < headPosition.col) {
                            var range = selections[i].getRange();
                            if (range.minRow <= row &&
                                row + cs.rowspan - 1 <= range.maxRow) {
                                selColor = style.selectionRCBackgroundColor;
                                selOpacity = style.selectionRCBackgroundOpacity;
                            }
                        }
                    }
                }
                cellModel.setSelectedColor(selColor, selOpacity);
            };
            var layoutCells = function (r, c) {
                var $pane = panes[r][c];
                var $cells = $pane.children('TABLE');
                var cellsModel = $cells.data('model');
                var attr = attrs[r][c];
                var cs;
                for (var cRow = 0; cRow < cellsModel.getRowCount(); cRow += 1) {
                    var col = attr.minCol;
                    var row = cRow + attr.minRow;
                    for (var cCol = 0; cCol < cellsModel.getColCount(); cCol += 1) {
                        if (attr.minRow <= row && row <= attr.maxRow &&
                            attr.minCol <= col && col <= attr.maxCol) {
                            var span = getSpaned(row, col);
                            if (!span) {
                                cs = getMergedCellStyleAt(row, col);
                                setSpaned(cs);
                                var invisible = row - attr.minRow + cs.rowspan <= attr.leading.row ||
                                    col - attr.minCol + cs.colspan <= attr.leading.col;
                                var cellModel = cellsModel.getCellModelAt(cRow, cCol);
                                var size = getCellSize(cs);
                                cs.width = size.width + 'px';
                                cs.height = size.height + 'px';
                                cellModel.setCellStyle(cs);
                                if (!invisible) {
                                    cellModel.setCellValue(cs.formatter.html(getMergedCellValueAt(row, col)));
                                }
                                showSelectionBackground(cs, cellModel);
                                if (layoutEditor == null &&
                                    editorModel.row == row && editorModel.col == col) {
                                    cellModel.setSelectedColor(null, style.selectionRCBackgroundOpacity);
                                    layoutEditor = createLayoutEditor(r, c, row, col, size.width, size.height);
                                }
                            }
                            else if (span.row < attr.minRow || span.col < attr.minCol) {
                                cs = getEmptyCellStyle(row, col);
                                cellsModel.getCellModelAt(cRow, cCol).setCellStyle(cs);
                            }
                            else {
                                cCol -= 1;
                            }
                            col += 1;
                        }
                        else {
                            cs = getEmptyCellStyle(row, col);
                            cellsModel.getCellModelAt(cRow, cCol).setCellStyle(cs);
                        }
                    }
                }
                $cells.css({
                    left: attr.tableRect.left + 'px',
                    top: attr.tableRect.top + 'px',
                    width: attr.tableRect.width + 'px',
                    height: attr.tableRect.height + 'px'
                });
            };
            var getEmptyCellStyle = function (row, col) {
                return {
                    colspan: 1,
                    rowspan: 1,
                    borderLeft: style.borderWidth + 'px solid ' + style.borderColor,
                    borderTop: style.borderWidth + 'px solid ' + style.borderColor,
                    width: gridModel.getCellWidthAt(col) + 'px',
                    height: gridModel.getCellHeightAt(row) + 'px'
                };
            };
            var calcSelectionRect = function (attr, selection) {
                var range = selection.getRange();
                var minRow = range.minRow;
                var maxRow = range.maxRow;
                var minCol = range.minCol;
                var maxCol = range.maxCol;
                if (selection.mode == 'all') {
                    minRow = attr.minRow;
                    minCol = attr.minCol;
                    maxRow = attr.maxRow;
                    maxCol = attr.maxCol;
                }
                else if (selection.mode == 'col') {
                    minRow = attr.minRow;
                    maxRow = attr.maxRow;
                }
                else if (selection.mode == 'row') {
                    minCol = attr.minCol;
                    maxCol = attr.maxCol;
                }
                if (maxRow < attr.minRow || minRow > attr.maxRow ||
                    maxCol < attr.minCol || minCol > attr.maxCol) {
                    return null;
                }
                var calcWidth = function (start, end) {
                    return gridModel.calcWidth(start, end, tmpWCache);
                };
                var calcHeight = function (start, end) {
                    return gridModel.calcHeight(start, end, tmpHCache);
                };
                var getMin = function (min, val, calc) {
                    return min < val ? calc(min, val) : -calc(val, min);
                };
                var rect = { left: 0, top: 0, width: 0, height: 0 };
                rect.left = getMin(attr.minCol, minCol, calcWidth);
                rect.width = calcWidth(minCol, maxCol + 1);
                rect.top = getMin(attr.minRow, minRow, calcHeight);
                rect.height = calcHeight(minRow, maxRow + 1);
                rect.left += attr.tableRect.left;
                rect.top += attr.tableRect.top;
                rect.width += style.borderWidth;
                rect.height += style.borderWidth;
                return rect;
            };
            var layoutSelectionBorder = function (r, c, selection, className) {
                var $pane = panes[r][c];
                var attr = attrs[r][c];
                var $border = $pane.children('.' + className);
                var rect = selection != null ?
                    calcSelectionRect(attr, selection) : null;
                if (rect != null) {
                    if (selection.mode == 'all' || selection.mode == 'col') {
                        if (r == 0 || r == 1) {
                            rect.height += style.borderWidth;
                        }
                        if (r == 1 || r == 2) {
                            rect.top -= style.borderWidth;
                            rect.height += style.borderWidth;
                        }
                    }
                    if (selection.mode == 'all' || selection.mode == 'row') {
                        if (c == 0 || c == 1) {
                            rect.width += style.borderWidth;
                        }
                        if (c == 1 || c == 2) {
                            rect.left -= style.borderWidth;
                            rect.width += style.borderWidth;
                        }
                    }
                    if ($border.length == 0) {
                        $border = createSelectionBorder(className);
                        $pane.append($border);
                    }
                    $border.css({ display: '',
                        left: rect.left + 'px',
                        top: rect.top + 'px',
                        width: rect.width + 'px',
                        height: rect.height + 'px'
                    });
                }
                else {
                    $border.css({ display: 'none' });
                }
            };
            // start layout
            var timer = function () {
                var total = 0;
                var lastTime = +new Date();
                return function (label) {
                    var time = +new Date();
                    var delta = time - lastTime;
                    total += delta;
                    logger.debug(label + ' - ' + delta + '/' + total + '[ms]');
                    lastTime = time;
                };
            }();
            var rowCount = gridModel.getRowCount();
            var colCount = gridModel.getColCount();
            var headPosition = getHeadPosition();
            var lockPosition = getLockPosition();
            var tmpWCache = {};
            var tmpHCache = {};
            var scrollLeft = $scr.scrollLeft();
            var scrollTop = $scr.scrollTop();
            timer('#a0');
            var c1 = gridModel.calcWidth(0, headPosition.col);
            var c2 = gridModel.calcWidth(headPosition.col, lockPosition.col);
            var r1 = gridModel.calcHeight(0, headPosition.row);
            var r2 = gridModel.calcHeight(headPosition.row, lockPosition.row);
            var scrWidth = gridModel.calcWidth(lockPosition.col, colCount + 1) +
                style.borderWidth;
            var scrHeight = gridModel.calcHeight(lockPosition.row, rowCount + 1) +
                style.borderWidth;
            timer('#0');
            $grid.css({ width: gridModel.width + 'px', height: gridModel.height + 'px' });
            $scr.css({
                left: (c1 + c2) + 'px', width: (gridModel.width - c1 - c2) + 'px',
                top: (r1 + r2) + 'px', height: (gridModel.height - r1 - r2) + 'px'
            });
            $scrPane.css({ width: scrWidth + 'px', height: scrHeight + 'px' });
            // init pane rect info.
            for (var r = 0; r < 3; r += 1) {
                for (var c = 0; c < 3; c += 1) {
                    attrs[r][c].paneRect = { top: 0, left: 0, width: 0, height: 0 };
                }
            }
            var cWidth = $scr[0].clientWidth;
            var cHeight = $scr[0].clientHeight;
            for (var c = 0; c < 3; c += 1) {
                attrs[0][c].paneRect.top = 0;
                attrs[0][c].paneRect.height = r1;
                attrs[1][c].paneRect.top = r1;
                attrs[1][c].paneRect.height = r2;
                attrs[2][c].paneRect.top = r1 + r2;
                attrs[2][c].paneRect.height = cHeight;
            }
            for (var r = 0; r < 3; r += 1) {
                attrs[r][0].paneRect.left = 0;
                attrs[r][0].paneRect.width = c1;
                attrs[r][1].paneRect.left = c1;
                attrs[r][1].paneRect.width = c2;
                attrs[r][2].paneRect.left = c1 + c2;
                attrs[r][2].paneRect.width = cWidth;
            }
            for (var r = 0; r < 3; r += 1) {
                for (var c = 0; c < 3; c += 1) {
                    var rect = attrs[r][c].paneRect;
                    panes[r][c].css({
                        top: rect.top + 'px',
                        left: rect.left + 'px',
                        width: rect.width + 'px',
                        height: rect.height + 'px'
                    });
                }
            }
            $vLockLine.css({ left: (c1 + c2) + 'px', top: '0px',
                width: '0px', height: (r1 + r2 + cHeight) + 'px' });
            $hLockLine.css({ left: '0px', top: (r1 + r2) + 'px',
                width: (c1 + c2 + cWidth) + 'px', height: '0px' });
            $rLine.css({
                left: (c1 + c2 + cWidth - style.borderWidth) + 'px', top: r1 + 'px',
                width: '0px', height: (r2 + cHeight) + 'px' });
            $bLine.css({
                left: c1 + 'px', top: (r1 + r2 + cHeight - style.borderWidth) + 'px',
                width: (c2 + cWidth) + 'px', height: '0px' });
            //
            var editorModel = $editor.data('model');
            var layoutEditor = null;
            // reset index.
            colResizeAnchors.index = 0;
            rowResizeAnchors.index = 0;
            gridModel._spaned = {};
            timer('#1');
            // cells
            for (var r = 0; r < 3; r += 1) {
                for (var c = 0; c < 3; c += 1) {
                    calcCellsAttr(r, c);
                    layoutCells(r, c);
                    layoutResizeAnchors(r, c);
                    // selections
                    layoutSelectionBorder(r, c, selections.length == 1 ? selections[0] : null, currentSelectionClass);
                    layoutSelectionBorder(r, c, copySelection, copySelectionClass);
                }
            }
            timer('#2');
            var restLines = function (lines) {
                while (lines.index < lines.length) {
                    lines[lines.index].css({ display: 'none' });
                    lines.index += 1;
                }
            };
            restLines(rowResizeAnchors);
            restLines(colResizeAnchors);
            if (layoutEditor != null) {
                layoutEditor();
            }
            else {
                $editorHolder.css({
                    left: -($editorHolder.width() + 2) + 'px',
                    top: -($editorHolder.height() + 2) + 'px'
                });
            }
            timer('end layout');
        };
        var createLayoutEditor = function (r, c, row, col, cw, ch) {
            return function () {
                var attr = attrs[r][c];
                var cell = {
                    left: gridModel.calcWidth(attr.minCol, col, {}),
                    top: gridModel.calcHeight(attr.minRow, row, {})
                };
                var left = cell.left + attr.tableRect.left + style.padding;
                var top = cell.top + attr.tableRect.top + style.padding;
                var width = attr.paneRect.width;
                var height = attr.paneRect.height;
                var mask = {
                    left: left + attr.paneRect.left + style.borderWidth,
                    top: top + attr.paneRect.top + style.borderWidth,
                    width: cw,
                    height: ch
                };
                var editor = {
                    left: 0,
                    top: 0
                };
                if (left < 0) {
                    mask.left -= left;
                    mask.width += left;
                    editor.left += left;
                }
                if (left + mask.width + style.borderWidth > width) {
                    mask.width -= left + mask.width + style.borderWidth - width;
                }
                if (top < 0) {
                    mask.top -= top;
                    mask.height += top;
                    editor.top += top;
                }
                if (top + mask.height + style.borderWidth > height) {
                    mask.height -= top + mask.height + style.borderWidth - height;
                }
                $editorHolder.css({
                    left: mask.left + 'px',
                    top: mask.top + 'px',
                    width: mask.width + 'px',
                    height: mask.height + 'px',
                    overflow: 'hidden'
                });
                var editorModel = $editor.data('model');
                editorModel.validate();
                if (debug) {
                    $editor.css('background-color', '#ffcc00');
                }
                $editor.css({
                    left: (editor.left) + 'px',
                    top: (editor.top) + 'px',
                    width: cw + 'px',
                    height: ch + 'px'
                });
            };
        };
        var getMergedCellStyleAt = function (row, col) {
            var defaultCell = getDefaultCellStyleAt(row, col);
            var cs = gridModel.getCellStyleAt(row, col);
            for (var k in defaultCell) {
                if (typeof cs[k] != 'undefined') {
                    defaultCell[k] = cs[k];
                }
            }
            return defaultCell;
        };
        var getDefaultCellStyleAt = function (row, col) {
            var cs = {
                row: row,
                col: col,
                borderLeft: style.borderWidth + 'px solid ' + style.borderColor,
                borderTop: style.borderWidth + 'px solid ' + style.borderColor,
                color: '',
                backgroundColor: '',
                cursor: '',
                textAlign: '',
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: '',
                rowspan: 1,
                colspan: 1,
                editable: true,
                maxLength: Number.MAX_VALUE,
                formatter: gridModel.getDefaultFormatter()
            };
            var headPosition = getHeadPosition();
            if (row < headPosition.row && col < headPosition.col) {
                if (row == 0 && col == 0) {
                    cs.rowspan = headPosition.row;
                    cs.colspan = headPosition.col;
                    cs.backgroundColor = '#c0c0c0';
                    cs.cursor = 'default';
                    cs.editable = false;
                }
            }
            else if (col < headPosition.col) {
                cs.backgroundColor = '#f0f0f0';
                cs.textAlign = 'center';
                cs.cursor = 'default';
                cs.editable = false;
            }
            else if (row < headPosition.row) {
                cs.backgroundColor = '#f0f0f0';
                cs.textAlign = 'center';
                cs.cursor = 'default';
                cs.editable = false;
            }
            return cs;
        };
        var getMergedCellValueAt = function (row, col) {
            var defaultValue = getDefaultCellValueAt(row, col);
            var value = gridModel.getCellValueAt(row, col);
            return value != null ? value : defaultValue;
        };
        var getDefaultCellValueAt = function (row, col) {
            var headPosition = getHeadPosition();
            if (row < headPosition.row && col < headPosition.col) {
            }
            else if (row < headPosition.row) {
                if (row == 0) {
                    return Util.nToA(col);
                }
            }
            else if (col < headPosition.col) {
                if (col == 0) {
                    return '' + row;
                }
            }
            else {
            }
            return null;
        };
        var getCellSize = function (cs) {
            var colspan = cs.colspan;
            var rowspan = cs.rowspan;
            var width = gridModel.getCellWidthAt(cs.col);
            var height = gridModel.getCellHeightAt(cs.row);
            for (var c = 1; c < colspan; c += 1) {
                width += gridModel.getCellWidthAt(cs.col + c) + cellPadding;
            }
            for (var r = 1; r < rowspan; r += 1) {
                height += gridModel.getCellHeightAt(cs.row + r) + cellPadding;
            }
            return { width: width, height: height };
        };
        var setSpaned = function (cs) {
            var colspan = cs.colspan;
            var rowspan = cs.rowspan;
            for (var r = 0; r < rowspan; r += 1) {
                for (var c = 0; c < colspan; c += 1) {
                    if (c != 0 || r != 0) {
                        gridModel._spaned[(cs.row + r) + ':' + (cs.col + c)] =
                            { row: cs.row, col: cs.col };
                    }
                }
            }
        };
        var getSpaned = function (row, col) {
            return gridModel._spaned[row + ':' + col];
        };
        var getHeadPosition = function () {
            return gridModel._headPosition;
        };
        var getLockPosition = function () {
            return gridModel._lockPosition;
        };
        var gridModel = {
            width: 600,
            height: 400,
            _headPosition: { row: 1, col: 1 },
            _lockPosition: { row: 1, col: 1 },
            _defaultHeight: -1,
            _maxRowspan: 1,
            _maxColspan: 1,
            _calcWidthCache: {},
            _calcHeightCache: {},
            _spaned: {},
            _styles: {},
            _values: {},
            _widths: {},
            _heights: {},
            _valid: true,
            setHeadPosition: function (row, col) {
                gridModel._headPosition = { row: row, col: col };
            },
            setLockPosition: function (row, col) {
                gridModel._lockPosition = { row: row, col: col };
            },
            getRowCount: function () { return 10; },
            getColCount: function () { return 10; },
            getMinCellWidthAt: function (col) { return 0; },
            getMaxCellWidthAt: function (col) { return 500; },
            getMinCellHeightAt: function (row) { return 0; },
            getMaxCellHeightAt: function (row) { return 500; },
            isCellWidthResizableAt: function (col) {
                return !(col < gridModel._headPosition.col - 1);
            },
            isCellHeightResizableAt: function (row) {
                return !(row < gridModel._headPosition.row - 1);
            },
            getDefaultCellWidthAt: function (col) {
                return debug ? 50 + 20 * (col % 3) : 50;
            },
            getDefaultCellHeightAt: function (row) {
                if (gridModel._defaultHeight == -1) {
                    var fm = getFontMetrics('M');
                    gridModel._defaultHeight = fm.height;
                }
                return gridModel._defaultHeight;
            },
            getCellWidthAt: function (col) {
                if (typeof gridModel._widths[col] == 'number') {
                    return gridModel._widths[col];
                }
                return gridModel.getDefaultCellWidthAt(col);
            },
            getCellHeightAt: function (row) {
                if (typeof gridModel._heights[row] == 'number') {
                    return gridModel._heights[row];
                }
                return gridModel.getDefaultCellHeightAt(row);
            },
            setCellWidthAt: function (col, width) {
                width = Math.max(gridModel.getMinCellWidthAt(col), Math.min(width, gridModel.getMaxCellWidthAt(col)));
                var delta = width - gridModel.getCellWidthAt(col);
                gridModel._widths[col] = width;
                for (var k in gridModel._calcWidthCache) {
                    var cache = gridModel._calcWidthCache[k];
                    if (cache.start <= col && col < cache.end) {
                        cache.width += delta;
                    }
                }
                gridModel.invalidate();
            },
            setCellHeightAt: function (row, height) {
                height = Math.max(gridModel.getMinCellHeightAt(row), Math.min(height, gridModel.getMaxCellHeightAt(row)));
                var delta = height - gridModel.getCellHeightAt(row);
                gridModel._heights[row] = height;
                for (var k in gridModel._calcHeightCache) {
                    var cache = gridModel._calcHeightCache[k];
                    if (cache.start <= row && row < cache.end) {
                        cache.height += delta;
                    }
                }
                gridModel.invalidate();
            },
            getCellStyleAt: function (row, col) {
                return gridModel._styles[getRC(row, col)] || {};
            },
            setCellStyleAt: function (row, col, cs) {
                gridModel._styles[getRC(row, col)] = cs;
                if (typeof cs.rowspan != 'undefined') {
                    gridModel._maxRowspan = Math.max(gridModel._maxRowspan, cs.rowspan);
                }
                if (typeof cs.colspan != 'undefined') {
                    gridModel._maxColspan = Math.max(gridModel._maxColspan, cs.colspan);
                }
                gridModel.invalidate();
            },
            getMaxRowspan: function () {
                return gridModel._maxRowspan;
            },
            getMaxColspan: function () {
                return gridModel._maxColspan;
            },
            getCellValueAt: function (row, col) {
                var cv = gridModel._values[getRC(row, col)];
                return typeof cv != 'undefined' ? cv.value : null;
            },
            setCellValueAt: function (row, col, value) {
                var oldValue = gridModel.getCellValueAt(row, col);
                if (oldValue === value) {
                    return;
                }
                if (value != null) {
                    gridModel._values[getRC(row, col)] =
                        { row: row, col: col, value: value };
                }
                else {
                    delete gridModel._values[getRC(row, col)];
                }
                gridModel.invalidate();
                $grid.trigger('valuechange', {
                    row: row,
                    col: col,
                    value: value,
                    oldValue: oldValue
                });
            },
            forEachCell: function (callback) {
                var values = gridModel._values;
                for (var k in values) {
                    callback(values[k]);
                }
            },
            calcWidth: function (start, end, cache) {
                cache = cache || gridModel._calcWidthCache;
                var key = start + ':' + end;
                if (cache[key]) {
                    return cache[key].width;
                }
                var width = 0;
                for (var c = start; c < end; c += 1) {
                    width += gridModel.getCellWidthAt(c) + cellPadding;
                }
                cache[key] = { start: start, end: end, width: width };
                return width;
            },
            calcHeight: function (start, end, cache) {
                cache = cache || gridModel._calcHeightCache;
                var key = start + ':' + end;
                if (cache[key]) {
                    return cache[key].height;
                }
                var height = 0;
                for (var r = start; r < end; r += 1) {
                    height += gridModel.getCellHeightAt(r) + cellPadding;
                }
                cache[key] = { start: start, end: end, height: height };
                return height;
            },
            isCellEditableAt: function (row, col) {
                return getMergedCellStyleAt(row, col).editable;
            },
            parse: function (value) {
                value = value.replace(/[\s\u3000]+$/, ''); // rtrim
                return value.length == 0 ? null : value;
            },
            format: function (value) {
                return value != null ? '' + value : '';
            },
            getDefaultFormatter: function () {
                var formatter = {
                    parse: gridModel.parse,
                    format: gridModel.format,
                    html: function (value) { return html(formatter.format(value)); }
                };
                return formatter;
            },
            validate: function () {
                if (gridModel._valid) {
                    return;
                }
                doLayout();
                gridModel._valid = true;
            },
            invalidate: function () {
                gridModel._valid = false;
                window.setTimeout(gridModel.validate, 0);
            }
        };
        $grid.data('model', gridModel);
        if (debug) {
            $grid.on('valuechange', function (event, data) {
                logger.debug(JSON.stringify(data));
            });
        }
        return $grid;
    };
    var Util = function (numAlps) {
        var base = 'A'.charCodeAt(0);
        return {
            aToN: function (a) {
                var n = 0;
                for (var i = 0; i < a.length; i += 1) {
                    n = n * numAlps + (a.charCodeAt(i) - base + 1);
                }
                return n;
            },
            nToA: function (n) {
                var a = '';
                while (n > 0) {
                    var i = (n - 1) % numAlps;
                    a = String.fromCharCode(base + i) + a;
                    n = (n - i - 1) / numAlps;
                }
                return a;
            }
        };
    }(26);
    var getRC = function (row, col) {
        return Util.nToA(col) + row;
    };
    var createDiv = function () {
        return $('<div></div>');
    };
    var createPane = function (scroll) {
        if (scroll === void 0) { scroll = false; }
        return createDiv().css({ position: 'absolute',
            overflow: scroll ? 'scroll' : 'hidden' });
    };
    var createSVGElement = function (tagName) {
        return $(document.createElementNS('http://www.w3.org/2000/svg', tagName));
    };
    var createSet = function (a) {
        var s = {};
        for (var i = 0; i < a.length; i += 1) {
            s[a[i]] = true;
        }
        return s;
    };
    var createCache = function () {
        var cache = {};
        return {
            data: function (data, setter) {
                for (var k in data) {
                    var v = data[k];
                    if (cache[k] !== v) {
                        cache[k] = v;
                        setter(k, v);
                    }
                }
            }
        };
    };
    var quote = function (s) {
        return s.indexOf('"') != -1 || s.indexOf('\t') != -1 ||
            s.indexOf('\r') != -1 || s.indexOf('\n') != -1 ?
            '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var html = function (s) {
        var html = '';
        for (var i = 0; i < s.length; i += 1) {
            var c = s.charAt(i);
            if (c == '<') {
                html += '&lt;';
            }
            else if (c == '>') {
                html += '&gt;';
            }
            else if (c == '&') {
                html += '&amp;';
            }
            else if (c == '"') {
                html += '&quot;';
            }
            else if (c == '\n') {
                html += '<br/>';
            }
            else if (c == '\u0020') {
                html += '&nbsp;';
            }
            else if (c == '\t') {
                html += '&nbsp;&nbsp;&nbsp;&nbsp;';
            }
            else {
                html += c;
            }
        }
        return html;
    };
    var replaceText = function (target, replacement) {
        var doc = document;
        if (doc.selection) {
            var range = doc.selection.createRange();
            if (range.parentElement() == target) {
                range.text = replacement;
                range.scrollIntoView();
            }
        }
        else if (typeof target.selectionStart != 'undefined') {
            var pos = target.selectionStart + replacement.length;
            target.value = target.value.substring(0, target.selectionStart) +
                replacement +
                target.value.substring(target.selectionEnd);
            target.setSelectionRange(pos, pos);
        }
    };
    var csv_reader = function () {
        var CR = '\r';
        var LF = '\n';
        var QUOT = '"';
        var delm = '\t';
        var reader = function (s) {
            var index = 0;
            return {
                read: function () {
                    if (index < s.length) {
                        var c = s.charAt(index);
                        index += 1;
                        return c;
                    }
                    else {
                        return null;
                    }
                }
            };
        };
        var parse = function (s, h) {
            var r = reader(s);
            var quoted = false;
            var buf = '';
            var newLine = true;
            var item = function (eol) {
                if (eol === void 0) { eol = false; }
                h.item(buf);
                buf = '';
                if (eol) {
                    h.eol();
                    newLine = true;
                }
            };
            var read = function (c) {
                newLine = false;
                if (c == CR || c == LF) {
                    item(true);
                    if (c == CR) {
                        // read following LF
                        c = r.read();
                        if (c == null) {
                        }
                        else if (c == LF) {
                        }
                        else {
                            read(c);
                        }
                    }
                }
                else if (c == QUOT) {
                    quoted = true;
                }
                else if (c == delm) {
                    item();
                }
                else {
                    buf += c;
                }
            };
            var readQuoted = function (c) {
                if (c == QUOT) {
                    c = r.read();
                    if (c == QUOT) {
                        buf += QUOT;
                    }
                    else {
                        quoted = false;
                        if (c != null) {
                            read(c);
                        }
                    }
                }
                else {
                    buf += c;
                }
            };
            while (true) {
                var c = r.read();
                if (c == null) {
                    if (quoted) {
                        throw 'unexpected eof';
                    }
                    else {
                        break;
                    }
                }
                else if (quoted) {
                    readQuoted(c);
                }
                else {
                    read(c);
                }
            }
            if (!newLine) {
                item();
            }
        };
        var toDataArray = function (s) {
            var row = null;
            var rows = [];
            parse(s, {
                item: function (item) {
                    if (row == null) {
                        rows.push(row = []);
                    }
                    row.push(item);
                },
                eol: function () {
                    row = null;
                }
            });
            return rows;
        };
        return {
            parse: parse,
            toDataArray: toDataArray
        };
    }();
})(jscoregrid || (jscoregrid = {}));
;
