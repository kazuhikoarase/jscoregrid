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

declare namespace jscoregrid {

  interface Position {
    row : number;
    col : number;
  }

  interface CellValue {
    row : number;
    col : number;
    value : any;
  }

  interface CellStyle {
    row? : number;
    col? : number;
    borderLeft? : string;
    borderTop? : string;
    color? : string;
    backgroundColor? : string;
    cursor? : string;
    textAlign? : string;
    fontFamily? : string,
    fontSize? : string,
    fontWeight? : string;
    rowspan? : number;
    colspan? : number;
    editable? : boolean;
    maxLength? : number;
    formatter? : Formatter<any>;
  }

  interface Formatter<T> {
    html : (value : T) => string;
    format : (value : T) => string;
    parse : (value : string) => T;
  }

  interface MergedCellStyle extends CellStyle {
    width : string;
    height : string;
  }

  interface Selection {
    mode : string;
    update : (row : number, col : number) => boolean;
    getRow : () => number;
    getCol : () => number;
    getRange : () => Range;
  }

  interface Range {
    minRow : number;
    maxRow : number;
    minCol : number;
    maxCol : number;
    contains : (row : number, col : number) => boolean;
    containsRange : (range : Range) => boolean;
  }

  interface CellsAttr {
    paneRect : {
      left : number;
      top : number;
      width : number;
      height : number;
    },
    minCol : number;
    maxCol : number;
    minRow : number;
    maxRow : number;
    tableRect : {
      left : number;
      top : number;
      width : number;
      height : number;
    }
    leading : {
      row : number;
      col : number;
    }
  }

}
