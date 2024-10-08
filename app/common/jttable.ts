/**
 * TSTable - Class for dynamically generating JQuery tables in TypeScript
 */

/**
 *
 */
export interface JTTDParms {
    celltype?: string;
    settings?: JQuery.PlainObject;
    content?: JQuery<HTMLElement> | string;
}
export type JTElem = JQuery<HTMLElement> | string | JQuery.PlainObject;
export type JTRowItems = Array<JTElem>;

export interface JTTableParms {
    class?: string;
    caption?: string;
    head?: Array<JTRowItems>;
    body?: Array<JTRowItems>;
    foot?: Array<JTRowItems>;
}
/**
 * Determines if a parameter is a plain string
 * x Item to test
 */
function isString(x: any): x is string {
    return typeof x === 'string';
}

function isTDParms(x: any): x is JTTDParms {
    return x.content !== undefined;
}

export interface JTRowParms {
    class?: string;
    celltype?: string;
    row?: JTRowItems;
}

/**
 * Determines the type of a parameter for a new row so that you
 * don't have to pass in the class or other attributes if you only
 * want to create a simple row
 * parms
 */
// function isRowParms(parms: JTRowParms | JTRowItems): parms is JTRowParms {
//     return true;
// }

export class JTRow {
    public celltype: string;
    public row: JTRowItems;
    public rowClass: string;
    public attrset: JQuery.PlainObject;
    constructor(parms?: JTRowParms | JTRowItems) {
        this.celltype = 'td';
        this.row = [];
        if (parms !== null && parms !== undefined) {
            if (Array.isArray(parms)) {
                this.row = parms as JTRowItems;
            } else {
                if (parms.celltype !== undefined) {
                    this.celltype = parms.celltype;
                }
                if (parms.row !== undefined) {
                    this.row = parms.row;
                }
                if (parms.class !== undefined) {
                    this.rowClass = parms.class;
                }
            }
        }
    }
    public setCellType(celltype: string): JTRow {
        this.celltype = celltype;
        return this;
    }
    public attr(attrset: JQuery.PlainObject): JTRow {
        this.attrset = attrset;
        return this;
    }
    /**
     * Adds a new element to the row.  This returns the row so you can chain
     * elem Element to be added (string | JQuery<HTMLElement>)
     */
    public add(elem: JTElem): JTRow {
        if (elem !== null && elem !== undefined) {
            this.row.push(elem);
        }
        return this;
    }
    /**
     * Generates the dom object from this Row.  Note that if the row is empty
     * we don't generate anything at all
     */
    public generate(): JQuery<HTMLElement> {
        // If the row is empty, we toss it out
        if (this.row.length === 0) {
            return null;
        }
        const row = $('<tr/>');
        if (this.rowClass !== undefined) {
            row.addClass(this.rowClass);
        }
        if (this.attrset !== undefined) {
            row.attr(this.attrset);
        }
        for (const item of this.row) {
            let cell = null;
            let celltype = this.celltype;
            if (isTDParms(item)) {
                if (item.celltype !== null && item.celltype !== undefined) {
                    celltype = item.celltype;
                }
                cell = $('<' + celltype + '>', item.settings).append(item.content);
            } else {
                cell = $('<' + celltype + '>');
                // For strings we want to set the text of the cell so that it doesn't
                // attempt to interpret it as html
                if (isString(item)) {
                    cell.text(item);
                } else {
                    cell.append(item);
                }
            }
            row.append(cell);
        }
        return row;
    }
}

/**
 * Creates a new table object that can be used to generate an HTML Table
 */
export class JTTable {
    public class: string = null;
    public caption: string = null;
    public header: Array<JTRow> = [];
    public body: Array<JTRow> = [];
    public footer: Array<JTRow> = [];

    constructor(parms: JTTableParms) {
        this.class = parms.class;
        this.caption = parms.caption;
        if (parms.head !== undefined) {
            for (const rowdata of parms.head) {
                this.addHeaderRow(rowdata);
            }
        }
        if (parms.body !== undefined) {
            for (const rowdata of parms.body) {
                this.addBodyRow(rowdata);
            }
        }
        if (parms.foot !== undefined) {
            for (const rowdata of parms.foot) {
                this.addFooterRow(rowdata);
            }
        }
    }

    /**
     * Adds a new header row and returns it so you can add elements to it
     * parms Header row items to add
     */
    public addHeaderRow(parms?: JTRowParms | JTRowItems): JTRow {
        const newRow = new JTRow(parms).setCellType('th');
        this.header.push(newRow);
        return newRow;
    }

    /**
     * Adds a new body row and returns it so you can add elements to it
     * parms Body row items to add
     */
    public addBodyRow(parms?: JTRowParms | JTRowItems): JTRow {
        const newRow = new JTRow(parms);
        this.body.push(newRow);
        return newRow;
    }

    /**
     * Adds a new Footer row and returns it so you can add elements to it
     * parms Footer row items to add
     */
    public addFooterRow(parms?: JTRowParms | JTRowItems): JTRow {
        const newRow = new JTRow(parms);
        this.footer.push(newRow);
        return newRow;
    }
    /**
     * Generates the final table using everything that was gathered
     */
    public generate(): JQuery<HTMLElement> {
        const table = $('<table/>', { class: this.class });
        if (this.header.length) {
            const thead = $('<thead/>');
            for (const row of this.header) {
                thead.append(row.generate());
            }
            table.append(thead);
        }
        if (this.body.length) {
            const tbody = $('<tbody/>');
            for (const row of this.body) {
                tbody.append(row.generate());
            }
            table.append(tbody);
        }
        if (this.footer.length) {
            const tfoot = $('<tfoot/>');
            for (const row of this.footer) {
                tfoot.append(row.generate());
            }
            table.append(tfoot);
        }
        return table;
    }
}
