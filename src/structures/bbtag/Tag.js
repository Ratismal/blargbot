'use strict';

const Iterator = require('../StringIterator');
const { Range } = require('../Position');

/**
 * This represents a block of text within the BBTag language.
 * @template T
 */
class BaseTag {

    /** 
     * @type {String}
     * The whole text from which this tag and its relatives can be derived
     * */
    get source() { return this._protected.source; }
    /** 
     * @type {Number}
     * The position in `source` where this tag starts
     * */
    get start() { return this._protected.start; }
    /** 
     * @type {Number}
     * The position in `source` where this tag ends
     * */
    get end() { return this._protected.end; }
    /**
     * @type {Range}
     * The range this tag spans
     */
    get range() { return this._protected.range; }
    /** 
     * @type {String}
     * The text that is contained in this tag
    */
    get content() { return this.source.slice(this.start, this.end); }
    /** 
     * @type {T?}
     * The tag which this tag is contained within
     * */
    get parent() { return this._protected.parent; }
    /** 
     * @type {T[]}
     * All the tags contained withinin this tag
     * */
    get children() { return this._protected.children; }

    /** @param {string|T} parent The parent of this tag */
    constructor(parent) {
        this._protected = {
            children: []
        };
        if (typeof parent == 'string')
            this._protected.source = parent;
        else {
            this._protected.parent = parent;
            this._protected.source = parent.source;
        }
    }
}

/**
 * This represents a recognized subtag structure. Subtags are strings starting and ending with {}
 * And contain sections of BBTag delimited by ;
 * @extends {BaseTag<BBTag>}
 */
class SubTag extends BaseTag {
    get name() { return this.children[0]; }

    /**
     * Attempts to create a SubTag object from the given values.
     * @param {BBTag} parent The parent to use for creation of this SubTag instance
     * @param {Iterator} iterator The start position of this SubTag instance
     */
    static parse(parent, iterator) {
        let result = new SubTag(parent);
        result._protected.start = iterator.current;
        let start = iterator.position;

        while (iterator.moveNext()) {
            if (iterator.prevChar == '}') break;
            result._protected.children.push(BBTag.parse(result, iterator));
        }

        result._protected.end = iterator.current;
        result._protected.range = new Range(start, iterator.position);
        return result;
    }


    /** @param {string|BBTag} parent */
    constructor(parent) {
        super(parent);
    }

    /**
     * @returns {{tag:BaseTag,position:number,message:String}[]}
     */
    validate() {
        let errors = [];
        let checkChild = (i, callback) => {
            let child = this.children.slice(i, i + 1 || undefined)[0];
            if (child === undefined)
                return false;
            return callback(child);
        };

        if (!this.content.startsWith('{') || checkChild(1, c => c.start == this.start))
            errors.push({ tag: this, position: this.end, message: 'Unmatched \'}\'' });
        if (!this.content.endsWith('}') || checkChild(-1, c => c.end == this.end))
            errors.push({ tag: this, position: this.start, message: 'Unmatched \'{\'' });

        for (const child of this.children)
            errors.push(...child.validate());

        return errors;
    }
}

/**
 * This represents both the top level text, and the contents of each argument in a subtag.
 * A subtag is a block of text between and including a {} pair, with arguments delimited by ;
 * @extends {BaseTag<SubTag>}
 */
class BBTag extends BaseTag {
    /**
     * Attempts to create a BBTag object from the given values.
     * @param {string|SubTag} parent The parent to use for creation of this BBTag instance
     * @param {Iterator} iterator The start position of this BBTag instance
     */
    static parse(parent, iterator = null) {
        if (typeof parent != 'string' && iterator == null)
            throw ('Must supply an iterator when parent is not a string');
        iterator = iterator || new Iterator(parent);
        let result = new BBTag(parent);
        result._protected.start = iterator.current;
        let start = iterator.position;

        do {
            if (iterator.nextChar == '}') break;
            if (iterator.nextChar == ';' && typeof parent != 'string') break;
            if (iterator.nextChar == '{') {
                result._protected.children.push(SubTag.parse(result, iterator));
                iterator.moveBack();
            }
        } while (iterator.moveNext());

        result._protected.end = iterator.current;
        result._protected.range = new Range(start, iterator.position);
        return result;
    }

    /** @param {string|SubTag} parent */
    constructor(parent) { super(parent); }

    /**
     * @returns {{tag:BaseTag,position:number,message:String}[]}
     */
    validate() {
        let errors = [];
        for (const child of this.children)
            errors.push(...child.validate());
        return errors;
    }
}


module.exports = {
    BaseTag,
    SubTag,
    BBTag
};