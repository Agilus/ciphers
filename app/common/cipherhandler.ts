import "foundation-sites";
import { BoolMap, cloneObject, NumberMap, StringMap } from "../common/ciphercommon";
import { CipherMenu } from "./ciphermenu";
import {
    getCipherEquivalents,
    getCipherTitle,
    ICipherType,
} from "./ciphertypes";
import { getVersion } from "./getversion";
import { JTButtonGroup, JTButtonItem } from "./jtbuttongroup";
import { JTFDialog } from "./jtfdialog";
import { JTFLabeledInput } from "./jtflabeledinput";
import { JTCreateMenu, JTGetSolveURL, JTGetURL } from "./jtmenu";
import { InitStorage, JTStorage } from "./jtstore";
import { JTTable } from "./jttable";
import { parseQueryString } from "./parsequerystring";
export const enum menuMode {
    aca, // ACA Solving Aid - File, edit menu and ACA menus
    test, // Test generation Tools - No file or Edit menu
    question, // Test question tool - File/Edit/Test Tools menu
    none, // No menu selected
}
/** Which mode the tool is operating in to select menus and file names */
export const enum toolMode {
    aca,
    codebusters,
}

/** The types of operations that an encoder will support */
export type IOperationType =
    | "encode" // Test question involves encoding
    | "decode" // Test question involves decoding
    | "compute" // Test question involves computing a math result
    | "let4let" // Baconian individual letter substitition
    | "sequence" // Baconian sequence substitition
    | "words" // Baconian word substitution
    | "rsa1"
    | "rsa2"
    | "rsa3"
    | "rsa4"
    | "rsa5";
/** The type of encoding for the alphabet */
export type IEncodeType = "random" | "k1" | "k2" | "k3" | "k4";
/**
 * The saved state for all ciphers.  This is used for undo/redo as well as
 * the save file format.
 */
export interface IState {
    /** The current cipher type we are working on */
    cipherType: ICipherType;
    /** The current cipher we are working on */
    cipherString: string;
    /** The current string we are looking for */
    findString?: string;
    /** The user has edited the keyword */
    userModified?: boolean;
    /** Currently selected keyword */
    keyword?: string;
    /** Replacement characters */
    replacement?: StringMap;
    /** Any additional save state data */
    undotype?: string;
    /** The type of operation */
    operation?: IOperationType;
    /** Number of points a question is worth */
    points?: number;
    /** Any quotation text to associate with the cipher */
    question?: string;
    /** Current language */
    curlang?: string;
    /** Indicates that a character is locked     */
    locked?: { [key: string]: boolean };
    /** Replacement order string */
    replOrder?: string;
    /** Type of encoding */
    encodeType?: IEncodeType;
    /** A formatted solution string */
    solution?: string;
    /** Is the problem solved? */
    solved?: boolean;
    /** Any other extensions not yet thought of */
    //  any?: any
}
/**
 * The save file format of a test
 */
export interface ITest {
    /** Title of the test */
    title: string;
    /** Which Cipher-Data.n element corresponds to the timed question.
     * If the value is blank, there is no timed question.
     */
    timed: number;
    /** The number of questions on the test */
    count: number;
    /** Array of which corresponding test elements to use. */
    questions: number[];
}

export interface IRunningKey {
    /** The title of the key */
    title: string;
    /** The text of the key */
    text: string;
}
type patelem = [string, number, number, number];
type JQElement = JQuery<HTMLElement>;
/**
 * Base class for all the Cipher Encoders/Decoders
 */
export class CipherHandler {
    /**
     * User visible mapping of names of the various languages supported
     */
    public readonly langmap: StringMap = {
        en: "English",
        nl: "Dutch",
        de: "German",
        eo: "Esperanto",
        es: "Spanish",
        fr: "French",
        it: "Italian",
        no: "Norwegian",
        pt: "Portuguese",
        sv: "Swedish",
        ia: "Interlingua",
        la: "Latin",
    };
    public guidanceURL: string = "TestGuidance.html";
    /**
     * This maps which characters are legal in a cipher for a given language
     */
    public readonly langcharset: StringMap = {
        en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        nl: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        de: "AÄBCDEFGHIJKLMNOÖPQRSßTUÜVWXYZ",
        eo: "ABCĈDEFGĜHĤIJĴKLMNOPRSŜTUŬVZ",
        es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
        fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        it: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        no: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅØÆ",
        pt: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        sv: "AÅÄBCDEFGHIJKLMNOÖPQRSTUVWXYZ",
        ia: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        la: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    };
    /**
     * Character replacement for purposes of encoding
     */
    public readonly langreplace: {
        [key: string]: { [key1: string]: string };
    } = {
        en: {},
        nl: {},
        de: {},
        eo: {},
        es: { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ý: "Y" },
        fr: {
            Ç: "C",
            Â: "A",
            À: "A",
            É: "E",
            Ê: "E",
            È: "E",
            Ë: "E",
            Î: "I",
            Ï: "I",
            Ô: "O",
            Û: "U",
            Ù: "U",
            Ü: "U",
        },
        it: { À: "A", É: "E", È: "E", Ì: "I", Ò: "O", Ù: "U" },
        no: {},
        pt: {
            Á: "A",
            Â: "A",
            Ã: "A",
            À: "A",
            Ç: "C",
            È: "E",
            Ê: "E",
            Í: "I",
            Ó: "O",
            Ô: "O",
            Õ: "O",
            Ú: "U",
        },
        sv: {},
        ia: {},
        la: {},
    };
    /**
     * This maps which characters are to be used when encoding an ACA cipher
     */
    public readonly acalangcharset: StringMap = {
        en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        nl: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        de: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
        fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        it: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        no: "ABCDEFGHIJKLMNOPRSTUVYZÆØÅ",
        pt: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        sv: "AÅÄBCDEFGHIJKLMNOÖPRSTUVYZ",
        ia: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        la: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    };
    /**
     * This maps which characters are to be encoded to for an ACA cipher
     */
    public readonly encodingcharset: StringMap = {
        en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        nl: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        de: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
        fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        it: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        no: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        pt: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        sv: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        ia: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        la: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    };
    /**
     * Character replacement for purposes of encoding
     */
    public readonly acalangreplace: {
        [key: string]: { [key1: string]: string };
    } = {
        en: {},
        nl: {},
        de: { Ä: "A", Ö: "O", ß: "SS", Ü: "U" },
        eo: { Ĉ: "C", Ĝ: "G", Ĥ: "H", Ĵ: "J", Ŝ: "S", Ŭ: "U" },
        es: { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ý: "Y" },
        fr: {
            Ç: "C",
            Â: "A",
            À: "A",
            É: "E",
            Ê: "E",
            È: "E",
            Ë: "E",
            Î: "I",
            Ï: "I",
            Ô: "O",
            Û: "U",
            Ù: "U",
            Ü: "U",
        },
        it: { É: "E", È: "E", Ì: "I", Ò: "O", Ù: "U" },
        no: {},
        pt: {
            Á: "A",
            Â: "A",
            Ã: "A",
            À: "A",
            Ç: "C",
            È: "E",
            Ê: "E",
            Í: "I",
            Ó: "O",
            Ô: "O",
            Õ: "O",
            Ú: "U",
        },
        sv: {},
        ia: {},
        la: {},
    };
    /**
     * Language character frequency
     */
    public readonly langfreq: { [key: string]: { [key1: string]: number } } = {
        en: {
            E: 0.1249,
            T: 0.0928,
            A: 0.0804,
            O: 0.0764,
            I: 0.0757,
            N: 0.0723,
            S: 0.0651,
            R: 0.0628,
            H: 0.0505,
            L: 0.0407,
            D: 0.0382,
            C: 0.0334,
            U: 0.0273,
            M: 0.0251,
            F: 0.024,
            P: 0.0214,
            G: 0.0187,
            W: 0.0168,
            Y: 0.0166,
            B: 0.0148,
            V: 0.0105,
            K: 0.0054,
            X: 0.0023,
            J: 0.0016,
            Q: 0.0012,
            Z: 0.0009,
        },
        nl: {
            E: 0.204011,
            N: 0.112494,
            T: 0.0668511,
            A: 0.0562471,
            O: 0.0534809,
            I: 0.0525588,
            R: 0.0509451,
            D: 0.0447211,
            S: 0.0421853,
            L: 0.0295067,
            G: 0.027432,
            H: 0.0246657,
            M: 0.0239742,
            V: 0.0214385,
            B: 0.0189027,
            W: 0.0189027,
            K: 0.0186722,
            U: 0.0165975,
            P: 0.0156754,
            C: 0.0147533,
            IJ: 0.0124481,
            Z: 0.0119871,
            J: 0.0080682,
            F: 0.005302,
            É: 0.0011526,
            X: 0.0002305,
        },
        de: {
            E: 0.149958,
            N: 0.10262,
            I: 0.0826712,
            S: 0.0814877,
            R: 0.0704987,
            A: 0.0644125,
            T: 0.0486898,
            H: 0.0468301,
            D: 0.046661,
            U: 0.0365173,
            G: 0.0360101,
            L: 0.0339814,
            B: 0.0255283,
            O: 0.0255283,
            F: 0.019104,
            V: 0.016399,
            K: 0.0162299,
            M: 0.0162299,
            W: 0.0155537,
            Z: 0.008115,
            Ü: 0.0079459,
            P: 0.0064243,
            Ä: 0.0050719,
            Ö: 0.0030431,
            J: 0.002705,
            ß: 0.0006762,
            Q: 0.0001691,
        },
        eo: {
            A: 0.122894,
            E: 0.0982128,
            O: 0.0917447,
            N: 0.0837447,
            I: 0.0791489,
            S: 0.0568511,
            R: 0.0558298,
            T: 0.0556596,
            L: 0.0549787,
            K: 0.0408511,
            M: 0.0309787,
            P: 0.0308085,
            D: 0.0294468,
            U: 0.0292766,
            J: 0.0248511,
            V: 0.0228085,
            G: 0.0153191,
            B: 0.0093617,
            C: 0.0088511,
            F: 0.0069787,
            Ü: 0.0062979,
            Z: 0.0061277,
            H: 0.0059575,
            Ĝ: 0.0054468,
            Ĉ: 0.0040851,
            Ŝ: 0.0011915,
            Ĵ: 0.0010213,
        },
        es: {
            E: 0.1408,
            A: 0.1216,
            O: 0.092,
            S: 0.072,
            N: 0.0683,
            R: 0.0641,
            I: 0.0598,
            L: 0.0524,
            U: 0.0469,
            D: 0.0467,
            T: 0.046,
            C: 0.0387,
            M: 0.0308,
            P: 0.0289,
            B: 0.0149,
            H: 0.0118,
            Q: 0.0111,
            Y: 0.0109,
            V: 0.0105,
            G: 0.01,
            F: 0.0069,
            J: 0.0052,
            Z: 0.0047,
            Ñ: 0.0017,
            X: 0.0014,
            K: 0.0011,
            W: 0.0004,
        },
        fr: {
            E: 0.1406753,
            T: 0.0895584,
            I: 0.0820779,
            N: 0.0792727,
            S: 0.0753247,
            A: 0.073039,
            R: 0.065039,
            O: 0.0643117,
            L: 0.0571429,
            U: 0.0520519,
            D: 0.0457143,
            C: 0.0353247,
            É: 0.0268052,
            P: 0.0253506,
            M: 0.0225455,
            V: 0.0093506,
            G: 0.0085195,
            Q: 0.0083117,
            F: 0.0082078,
            B: 0.0078961,
            À: 0.0065455,
            H: 0.0047792,
            X: 0.0045714,
            Ê: 0.0023896,
            Y: 0.0020779,
            J: 0.0011429,
            È: 0.001039,
            Ù: 0.0004156,
            Â: 0.0002078,
            Ô: 0.0002078,
            Û: 0.0001039,
        },
        it: {
            I: 0.137609,
            E: 0.104323,
            A: 0.0923483,
            O: 0.0921453,
            T: 0.0574386,
            N: 0.0572356,
            L: 0.0566268,
            R: 0.0539882,
            S: 0.0527704,
            C: 0.0481023,
            G: 0.038563,
            U: 0.0355186,
            D: 0.033083,
            P: 0.0300386,
            M: 0.0271971,
            B: 0.0142074,
            H: 0.0125837,
            Z: 0.0125837,
            È: 0.0103511,
            V: 0.0101482,
            F: 0.0085245,
            Q: 0.00548,
        },
        no: {
            E: 0.16463,
            N: 0.0888383,
            A: 0.067923,
            I: 0.0668876,
            R: 0.0646096,
            D: 0.0635742,
            T: 0.0635742,
            S: 0.0509422,
            L: 0.0499068,
            O: 0.0399669,
            G: 0.0397598,
            V: 0.0395527,
            K: 0.0339615,
            M: 0.0304411,
            H: 0.0298198,
            F: 0.0217436,
            U: 0.0155312,
            P: 0.0130462,
            B: 0.0113895,
            J: 0.0097329,
            Ø: 0.0082833,
            Å: 0.0070408,
            Y: 0.0057983,
            Æ: 0.0,
            C: 0.0,
            Z: 0.0,
        },
        pt: {
            E: 0.148438,
            A: 0.121094,
            O: 0.102711,
            I: 0.0714614,
            R: 0.0597426,
            S: 0.0574449,
            D: 0.053079,
            M: 0.0500919,
            T: 0.0500919,
            N: 0.0471048,
            U: 0.0381434,
            C: 0.0358456,
            L: 0.0310202,
            V: 0.0186121,
            P: 0.0183824,
            G: 0.0126379,
            B: 0.0091912,
            Ã: 0.0087316,
            Q: 0.0082721,
            F: 0.0080423,
            H: 0.0080423,
            Ç: 0.0055147,
            Z: 0.0032169,
            Á: 0.0029871,
            Ê: 0.0029871,
            NH: 0.0025276,
            É: 0.0022978,
            J: 0.0018382,
            Ó: 0.0016085,
            X: 0.0013787,
            LH: 0.0009191,
            Â: 0.0004596,
            Õ: 0.0002298,
            W: 0.0,
            Y: 0.0,
        },
        sv: {
            N: 0.102144,
            A: 0.0962783,
            E: 0.0958738,
            R: 0.0671521,
            T: 0.0647249,
            I: 0.0552184,
            S: 0.0533981,
            D: 0.0523867,
            L: 0.0517799,
            O: 0.0410599,
            V: 0.0400485,
            H: 0.0386327,
            M: 0.0351942,
            G: 0.0287217,
            K: 0.0287217,
            F: 0.0218447,
            Ä: 0.0212379,
            Ö: 0.0147654,
            P: 0.0141586,
            C: 0.0141586,
            Å: 0.013754,
            U: 0.0133495,
            B: 0.0121359,
            J: 0.00768608,
            Y: 0.0052589,
            X: 0.000202265,
        },
        ia: {
            E: 0.1729506,
            T: 0.0905528,
            A: 0.0898115,
            I: 0.0847278,
            O: 0.0773141,
            N: 0.0724423,
            R: 0.0647109,
            L: 0.064499,
            S: 0.0635459,
            C: 0.0420462,
            D: 0.0416225,
            U: 0.035268,
            P: 0.0267952,
            M: 0.021076,
            B: 0.0102732,
            H: 0.0083669,
            V: 0.0083669,
            F: 0.008261,
            G: 0.0075196,
            Q: 0.0073078,
            J: 0.0009532,
            X: 0.0009532,
            Y: 0.0006355,
            K: 0.0,
            W: 0.0,
            Z: 0.0,
        },
        la: {
            I: 0.1333172,
            E: 0.123415,
            T: 0.0906895,
            A: 0.0809081,
            S: 0.0775269,
            U: 0.075957,
            N: 0.0640019,
            O: 0.058447,
            R: 0.0528922,
            M: 0.0495109,
            C: 0.0362275,
            P: 0.0299481,
            D: 0.0266876,
            L: 0.0251177,
            Q: 0.0163024,
            B: 0.0161816,
            G: 0.0108683,
            V: 0.0102645,
            H: 0.0091776,
            F: 0.0089361,
            X: 0.0036228,
            J: 0.0,
            K: 0.0,
            W: 0.0,
            Y: 0.0,
            Z: 0.0,
        },
    };
    public defaultstate: IState = {
        /** The current cipher typewe are working on */
        cipherType: ICipherType.Vigenere /** Currently selected keyword */,
        keyword: "" /** The current cipher we are working on */,
        cipherString: "" /** The current string we are looking for */,
        findString: "" /** Replacement characters */,
        replacement: {} /** Current language */,
        curlang: "",
    };
    public state: IState = cloneObject(this.defaultstate) as IState;
    public undocmdButton: JTButtonItem = {
        title: "Undo",
        id: "undo",
        color: "primary",
        class: "undo",
        disabled: true,
    };
    public redocmdButton: JTButtonItem = {
        title: "Redo",
        id: "redo",
        color: "primary",
        class: "redo",
        disabled: true,
    };

    public cmdButtons: JTButtonItem[] = [
        { title: "Load", color: "primary", id: "load" },
        this.undocmdButton,
        this.redocmdButton,
        { title: "Reset", color: "warning", id: "reset" },
    ];
    public testStrings: string[] = [];
    public defaultRunningKeys: IRunningKey[] = [
        {
            title: "Gettysburg address",
            text:
                "FOUR SCORE AND SEVEN YEARS AGO OUR FATHERS BROUGHT FORTH ON THIS CONTINENT, " +
                "A NEW NATION, CONCEIVED IN LIBERTY, AND DEDICATED TO THE " +
                "PROPOSITION THAT ALL MEN ARE CREATED EQUAL.",
        },
        {
            title: "Declaration of Independence",
            text:
                "WHEN IN THE COURSE OF HUMAN EVENTS IT BECOMES NECESSARY FOR ONE PEOPLE TO " +
                "DISSOLVE THE POLITICAL BANDS WHICH HAVE CONNECTED THEM WITH ANOTHER AND TO ASSUME " +
                "AMONG THE POWERS OF THE EARTH, THE SEPARATE AND EQUAL STATION TO WHICH THE LAWS " +
                "OF NATURE AND OF NATURE'S GOD ENTITLE THEM, A DECENT RESPECT TO THE OPINIONS OF " +
                "MANKIND REQUIRES THAT THEY SHOULD DECLARE THE CAUSES WHICH IMPEL THEM TO THE SEPARATION.",
        },
        {
            title: "Constitution of United States of America",
            text:
                "WE THE PEOPLE OF THE UNITED STATES, IN ORDER TO FORM A MORE PERFECT UNION, " +
                "ESTABLISH JUSTICE, INSURE DOMESTIC TRANQUILITY, PROVIDE FOR THE COMMON DEFENSE, " +
                "PROMOTE THE GENERAL WELFARE, AND SECURE THE BLESSINGS OF LIBERTY TO OURSELVES AND " +
                "OUR POSTERITY, DO ORDAIN AND ESTABLISH THIS CONSTITUTION FOR THE " +
                "UNITED STATES OF AMERICA.",
        },
        {
            title: "MAGNA CARTA (In Latin)",
            text:
                "JOHANNES DEI GRACIA REX ANGLIE, DOMINUS HIBERNIE, DUX NORMANNIE, " +
                "AQUITANNIE ET COMES ANDEGAVIE, ARCHIEPISCOPIS, EPISCOPIS, ABBATIBUS, COMITIBUS, " +
                "BARONIBUS, JUSTICIARIIS, FORESTARIIS, VICECOMITIBUS, PREPOSITIS, " +
                "MINISTRIS ET OMNIBUS BALLIVIS ET FIDELIBUS SUIS SALUTEM.",
        },
    ];
    /** Any special running key not in the default set used by this cipher */
    public extraRunningKey: string;
    /** Indicates that the cipher uses a running key */
    public usesRunningKey: boolean = false;
    /** The direction of the last advance */
    public advancedir: number = 0;
    /** The Jquery element associated with a keypress */
    public keyTarget: JQuery<HTMLElement>;
    public cipherWidth: number = 1;
    public charset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    public sourcecharset: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    public unasigned: string = "";
    public holdupdates: boolean = false;
    /** Stack of current Undo/Redo operations */
    public undoStack: IState[] = [];
    /** We can merge the next operation */
    public undoCanMerge: boolean = false;
    /** The type of the last undo requested */
    public lastUndoRequest: string = undefined;
    /** Where we are in the undo stack */
    public undoPosition: number = 0;
    /** Indicates that we need to queue an undo item before executing an Undo */
    public undoNeeded: string = undefined;
    public activeToolMode: toolMode = toolMode.aca;
    /** Strings for managing storage of ciphers */
    public storageTestCountName: string = "Cipher-Test-Count";
    public storageTestEntryPrefix: string = "Cipher-Test";
    public storageCipherCountName: string = "Cipher-Count";
    public storageCipherEntryPrefix: string = "Cipher-Data";
    /**
     * The maximum number of characters to
     * be shown on an encoded line so that it can be readily pasted into a test
     * This is a global config that no ciphers actually set
     */
    public maxEncodeWidth: number = 53;
    /**
     * Output the reverse replacement row in the frequency table.  This is set
     * by the individual cipher types on initialization
     */
    public ShowRevReplace: boolean = true;
    /**
     * Input string cleaned up.  This does not need to be saved because it is
     * rebuild by the build() function based in this.state.cipherString
     */
    public encodedString: string = "";
    public Frequent: { [key: string]: { [key: string]: patelem[] } } = {};
    public freq: { [key: string]: number } = {};
    public savefileentry: number = -1;
    public storage: JTStorage;
    constructor() {
        this.storage = InitStorage();
    }
    public initToolModeSettings(): void {
        if (this.activeToolMode === toolMode.aca) {
            this.storageTestCountName = "ACA-Issue-Count";
            this.storageTestEntryPrefix = "ACA-Issue";
            this.storageCipherCountName = "ACA-Count";
            this.storageCipherEntryPrefix = "ACA-Data";
            $(".menu-text a").text("ACA Cipher Tools");
        } else {
            this.storageTestCountName = "Cipher-Test-Count";
            this.storageTestEntryPrefix = "Cipher-Test";
            this.storageCipherCountName = "Cipher-Count";
            this.storageCipherEntryPrefix = "Cipher-Data";
            $(".menu-text a").text("Science Olympiad CodeBusters");
        }
    }
    /**
     * Gets the total number of saved tests
     * Cipher-Test-Count [number] holds the number of tests in the system.
     * Cipher-Test.n [JSON] holds the data for the test n.
     */
    public getTestCount(): number {
        let result = 0;
        if (this.storage.isAvailable()) {
            let val = Number(this.storage.get(this.storageTestCountName));
            if (!isNaN(val)) {
                result = val;
            }
        }
        return result;
    }
    /**
     * Set the number of cipher tests stored in local storage
     */
    public setTestCount(count: number): string {
        if (!this.storage.isAvailable()) {
            return "Unable to save, local storage not defined";
        }
        this.storage.set(this.storageTestCountName, String(count));
        return "";
    }
    /**
     * Gets the string that corresponds to a test in local storage
     */
    public getTestName(entry: number): string {
        return this.storageTestEntryPrefix + String(entry);
    }
    /**
     * Retrieves a test entry from local storage
     */
    public getTestEntry(entry: number): ITest {
        let result: ITest = {
            timed: -1,
            title: "Invalid Test",
            count: 0,
            questions: [],
        };
        if (this.storage.isAvailable()) {
            let testCount = this.getTestCount();
            if (entry < testCount) {
                result = this.storage.getJSON(this.getTestName(entry));
            }
        }
        if (result.timed === undefined) {
            result.timed = -1;
        }
        return result;
    }
    /**
     * Writes a test entry to local storage.  An entry of -1 or
     * greater than the number of entries just writes as a new entry
     * @param entry Entry to store test as (-1 for a new entry)
     * @param state New test data
     * @returns Entry of newly stored test (-1 for failure)
     */
    public setTestEntry(entry: number, state: ITest): number {
        if (!this.storage.isAvailable()) {
            return -1;
        }
        let testCount = this.getTestCount();
        if (entry > testCount || entry === -1) {
            entry = testCount;
            this.setTestCount(entry + 1);
        }
        this.storage.set(this.getTestName(entry), state);
        return entry;
    }
    /**
     * Removes a file entry, renumbering all the other entries after it
     */
    public deleteTestEntry(entry: number): string {
        if (!this.storage.isAvailable()) {
            return "Unable to delete, local storage not defined";
        }
        let testCount = this.getTestCount();
        if (entry < testCount && entry >= 0) {
            for (let pos = entry + 1; pos < testCount; pos++) {
                this.storage.set(
                    this.getTestName(pos - 1),
                    this.storage.getJSON(this.getTestName(pos))
                );
            }
            this.storage.remove(this.getTestName(testCount));
            this.setTestCount(testCount - 1);
        }
        return "";
    }
    /**
     * Get the total number of saved ciphers
     */
    public getCipherCount(): number {
        let result = 0;
        if (this.storage.isAvailable()) {
            let val = Number(this.storage.get(this.storageCipherCountName));
            if (!isNaN(val)) {
                result = val;
            }
        }
        return result;
    }
    /**
     * Gets the string that corresponds to an entry in local storage
     * Cipher-Data<n> [JSON] holds the data from question n. Note n is zero based.
     */
    public getEntryName(entry: number): string {
        return this.storageCipherEntryPrefix + String(entry);
    }
    /**
     * Get the save state associated with a numbered file entry
     */
    public getFileEntry(entry: number): IState {
        let result: IState = null;
        if (this.storage.isAvailable()) {
            let cipherCount = this.getCipherCount();
            if (entry < cipherCount) {
                result = this.storage.getJSON(this.getEntryName(entry));
            }
        }
        return result;
    }
    /**
     * Populate the file list dialog to match all the entries of a given type
     */
    public getFileList(ciphertype: ICipherType): JQElement {
        let result = null;
        let cipherCount = this.getCipherCount();
        $("#okopen").prop("disabled", true);
        if (cipherCount === 0) {
            result = $("<div/>", {
                class: "callout warning filelist",
                id: "files",
            }).text("No files found");
        } else {
            // Generate a list of the types of ciphers that we allow
            let allowed = getCipherEquivalents(ciphertype);
            result = $("<select/>", {
                id: "files",
                class: "filelist",
                size: 10,
            });
            for (let entry = 0; entry < cipherCount; entry++) {
                let fileEntry = this.getFileEntry(entry);
                if (allowed.indexOf(fileEntry.cipherType) !== -1) {
                    let entryText = "[" + String(entry) + "]:";
                    if (allowed.length !== 1) {
                        entryText +=
                            "(" + getCipherTitle(fileEntry.cipherType) + ") ";
                    }
                    if (
                        fileEntry.question !== "" &&
                        this.storageCipherEntryPrefix.substr(0, 1) === "A"
                    ) {
                        entryText += fileEntry.question;
                    } else if (fileEntry.cipherString !== "") {
                        entryText += fileEntry.cipherString;
                    } else {
                        entryText += fileEntry.question;
                    }
                    result.append(
                        $("<option />", {
                            value: entry,
                        }).html(entryText)
                    );
                }
            }
        }
        return result;
    }
    /**
     * Set the number of cipher entries stored in local storage
     */
    public setCipherCount(count: number): string {
        if (!this.storage.isAvailable()) {
            return "Unable to save, local storage not defined";
        }
        this.storage.set(this.storageCipherCountName, String(count));
        return "";
    }
    /**
     * Save a state entry to local storage. If the entry number is higher
     * than the total storage or is -1, it is appended to the end of all
     * the existing storage entries and the number of entries is incremented
     * by one to account for it
     */
    public setFileEntry(entry: number, state: IState): number {
        if (!this.storage.isAvailable()) {
            return -1;
        }
        let cipherCount = this.getCipherCount();
        if (entry > cipherCount || entry === -1) {
            entry = cipherCount;
            this.setCipherCount(entry + 1);
        }
        this.storage.set(this.getEntryName(entry), state);
        return entry;
    }
    /**
     * Removes a file entry, renumbering all the other entries after it
     */
    public deleteFileEntry(entry: number): string {
        if (!this.storage.isAvailable()) {
            return "Unable to delete, local storage not defined";
        }
        let cipherCount = this.getCipherCount();
        if (entry < cipherCount && entry >= 0) {
            for (let pos = entry + 1; pos < cipherCount; pos++) {
                this.storage.set(
                    this.getEntryName(pos - 1),
                    this.storage.getJSON(this.getEntryName(pos))
                );
            }
            this.storage.remove(this.getEntryName(cipherCount));
            this.setCipherCount(cipherCount - 1);
        }
        let testCount = this.getTestCount();
        for (let pos = 0; pos < testCount; pos++) {
            let test = this.getTestEntry(pos);
            if (test.timed > entry) {
                test.timed--;
            } else if (test.timed === entry) {
                test.timed = -1;
            }
            for (let i = test.questions.length; i >= 0; i--) {
                if (test.questions[i] > entry) {
                    test.questions[i]--;
                } else if (test.questions[i] === entry) {
                    test.questions.splice(i, 1);
                }
            }
            this.setTestEntry(pos, test);
        }
        return "";
    }
    /**
     * Gets the string that corresponds to a running key entry in local storage
     */
    public getRunningKeyName(entry: number): string {
        return "Running-Key." + String(entry);
    }
    /**
     * Retrieves a test entry from local storage
     */
    public getRunningKey(entry: number): IRunningKey {
        let result: IRunningKey;
        if (this.storage.isAvailable()) {
            result = this.storage.getJSON(this.getRunningKeyName(entry));
        }
        if (result === null) {
            result = undefined;
        }
        // Fill in a default if they haven't gotten one or what came in was bad
        if (
            (result === undefined || result.text === "") &&
            entry < this.defaultRunningKeys.length
        ) {
            result = this.defaultRunningKeys[entry];
        }
        return result;
    }
    public deleteRunningKey(entry: number): void {
        this.storage.remove(this.getRunningKeyName(entry));
    }
    public setRunningKey(entry: number, data: IRunningKey): void {
        if (!this.storage.isAvailable()) {
            return;
        }
        this.storage.set(this.getRunningKeyName(entry), data);
    }
    /**
     * Return all the available running keys
     * This includes defaults if none have been defined.
     * Note that we will never return more than 10 running keys and ideally
     * We only want to have 4 for space on the test
     */
    public getRunningKeyStrings(): IRunningKey[] {
        let result: IRunningKey[] = [];
        for (let entry = 0; entry < 10; entry++) {
            let ikey = this.getRunningKey(entry);
            if (ikey === undefined) {
                break;
            }
            result.push(ikey);
        }
        return result;
    }
    /**
     * Put up a dialog to select a cipher to load
     */
    public openCipher(): void {
        // Populate the list of known files.
        $("#files").replaceWith(this.getFileList(this.state.cipherType));
        $("#files")
            .off("change")
            .on("change", e => {
                $("#okopen").removeAttr("disabled");
            });
        $("#okopen").prop("disabled", true);
        $("#okopen")
            .off("click")
            .on("click", e => {
                this.savefileentry = Number($("#files option:selected").val());
                $("#OpenFile").foundation("close");
                this.markUndo(null);
                this.updateSaveEntryURL();
                this.restore(this.getFileEntry(this.savefileentry));
            });
        $("#OpenFile").foundation("open");
    }
    /**
     * Process imported XML
     */
    public importXML(data: any): void {}
    /**
     * Put up a dialog to select an XML file to import
     */
    public openXMLImport(useLocalData: boolean): void {
        $("#okimport").prop("disabled", true);
        $("#importstatus")
            .removeClass("success")
            .addClass("secondary");
        $("#xmltoimport").text("No File Selected");
        $("#xmlFile")
            .off("change")
            .on("change", e => {
                $("#okimport").removeAttr("disabled");
                $("#importstatus")
                    .removeClass("secondary")
                    .addClass("success");
                let fileinput: HTMLInputElement = $(
                    "#xmlFile"
                )[0] as HTMLInputElement;
                let files = fileinput.files;
                $("#xmltoimport").text(files[0].name + " selected");
            });
        $("#xmlurl")
            .off("input")
            .on("input", e => {
                let url = $(e.target).val() as string;
                if (url !== "") {
                    $("#okimport").removeAttr("disabled");
                } else {
                    $("#okimport").prop("disabled", true);
                }
            });
        $("#okimport")
            .off("click")
            .on("click", e => {
                if (useLocalData) {
                    let fileinput: HTMLInputElement = $(
                        "#xmlFile"
                    )[0] as HTMLInputElement;
                    let files = fileinput.files;
                    if (files.length && typeof FileReader !== undefined) {
                        let reader = new FileReader();
                        reader.readAsText(files[0]);
                        reader.onload = e1 => {
                            try {
                                let result = JSON.parse(
                                    reader.result as string
                                );
                                $("#ImportFile").foundation("close");
                                this.importXML(result);
                            } catch (e) {
                                $("#xmlerr").text("Not a valid import file");
                            }
                        };
                    }
                } else {
                    // They gave us a URL so let's do an AJAX call to pull it in
                    let url = $("#xmlurl").val() as string;
                    $.getJSON(url, data => {
                        $("#ImportFile").foundation("close");
                        this.importXML(data);
                    }).fail((jqxhr, settings, exception) => {
                        alert("Unable to load file " + url);
                    });
                }
            });
        if (useLocalData) {
            $(".impurl").hide();
            $(".impfile").show();
        } else {
            $(".impurl").show();
            $(".impfile").hide();
        }
        $("#ImportFile").foundation("open");
    }

    /**
     *  Save the current cipher to the current file
     */
    public saveCipher(): void {
        let state = this.save();
        this.savefileentry = this.setFileEntry(this.savefileentry, state);

        // We need to update the URL to indicate which entry they saved
        this.updateSaveEntryURL();
    }
    /**
     * Update the URL to reflect the current saved file entry
     */
    public updateSaveEntryURL(): void {
        let url = window.location.href.split("?")[0];
        // If the URL ends with a #, we want to make that go away
        url = url.replace(/#$/, "");
        window.history.replaceState(
            {},
            $("title").text(),
            url + "?editEntry=" + this.savefileentry
        );
    }

    /**
     * Save the current cipher state to a new file
     */
    public saveCipherAs(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Submit a cipher for checking
     */
    public submit(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Copy the current completed cipher to the clipboard
     */
    public copy(): void {
        throw new Error("Method not implemented.");
    }
    /**
     * Start a new cipher
     */
    public newCipher(): void {
        this.restore(this.defaultstate);
    }
    /**
     * Copies one state interface to another preserving fields that are already
     * in the destination
     */
    public copyState(dest: IState, source: IState): void {
        for (let elem of Object.keys(source)) {
            if (Array.isArray(source[elem])) {
                dest[elem] = source[elem].slice();
            } else if (typeof source[elem] === "object") {
                dest[elem] = cloneObject(source[elem]);
            } else {
                dest[elem] = source[elem];
            }
        }
    }
    /**
     * Set cipher encoder encode or decode mode
     */
    public setOperation(operation: IOperationType): boolean {
        let changed = false;
        if (this.state.operation !== operation) {
            this.state.operation = operation;
            changed = true;
        }
        return changed;
    }
    /**
     * Initializes the encoder/decoder.
     * Select the character sets based on the language and initialize the
     * current state
     */
    public init(lang: string): void {
        this.initToolModeSettings();
        this.defaultstate.curlang = lang;
        this.state = cloneObject(this.defaultstate) as IState;
        this.setCharset(this.acalangcharset[this.state.curlang]);
        this.setSourceCharset(this.encodingcharset[this.state.curlang]);
    }
    /**
     * Generates an HTML representation of a string for display
     */
    public normalizeHTML(str: string): string {
        return str;
    }
    /**
     * Creates an HTML table to display the frequency of characters
     */
    public createFreqEditTable(): JQElement {
        return null;
    }
    /**
     * Creates an HTML table to display the frequency of characters for printing
     * on the test and answer key
     * showanswers controls whether we display the answers or just the key
     * encodeType tells the type of encoding to print.  If it is 'random' then
     * we leave it blank.
     */
    public genFreqTable(showanswers: boolean, encodeType: string): JQElement {
        let table = new JTTable({
            class: "prfreq shrink cell unstriped",
        });
        let charset = this.getSourceCharset();
        let replalphabet = this.state.replacement;
        if (encodeType === "random") {
            encodeType = "";
        } else if (encodeType === "k2") {
            replalphabet = {};
            for (let c of charset.toUpperCase()) {
                replalphabet[this.state.replacement[c]] = c;
            }
        }
        // For a K2 cipher, the replacement row goes above the header row
        let replrow;
        if (encodeType === "k2") {
            replrow = table.addHeaderRow();
        }
        let headrow = table.addHeaderRow();
        let freqrow = table.addBodyRow();
        // For all other cipher types, the replacement row is below the frequency
        if (encodeType !== "k2") {
            replrow = table.addBodyRow();
        }

        headrow.add({
            settings: { class: "topleft " + encodeType },
            content: encodeType.toUpperCase(),
        });
        freqrow.add({ celltype: "th", content: "Frequency" });
        replrow.add({ celltype: "th", content: "Replacement" });

        for (let c of charset.toUpperCase()) {
            let repl = "";
            if (showanswers) {
                repl = replalphabet[c];
            }
            headrow.add(c);
            let freq = String(this.freq[c]);
            if (freq === "0") {
                freq = "";
            }
            freqrow.add(freq);
            replrow.add({ celltype: "td", content: repl });
        }
        return table.generate();
    }
    public genTestUsage(): JQuery<HTMLElement> {
        let result = $("<div/>", { class: "testuse" });
        let prefix = "Used on test(s): ";
        if (this.savefileentry !== -1) {
            // Find out what tests this is a part of
            let testCount = this.getTestCount();
            for (let entry = 0; entry < testCount; entry++) {
                let test = this.getTestEntry(entry);
                let use;
                if (test.timed === this.savefileentry) {
                    use = "Timed Question";
                } else {
                    let qnum = test.questions.indexOf(this.savefileentry);
                    if (qnum !== -1) {
                        use = "Question #" + String(qnum + 1);
                    }
                }
                if (use !== undefined) {
                    let link = $("<a/>", {
                        href: "TestGenerator.html?test=" + String(entry),
                    }).text(test.title + " " + use);
                    result.addClass("callout primary");
                    result.append(prefix).append(link);
                    prefix = ", ";
                }
            }
        }
        return result;
    }
    /**
     * Loads new data into a solver, preserving all solving matches made
     */
    public load(): void {}
    /**
     * Loads new data into a solver, resetting any solving matches made
     */
    public reset(): void {}

    public genCmdButtons(): JQElement {
        return JTButtonGroup(this.cmdButtons);
    }

    /**
     * Creates the Undo and Redo command buttons
     */
    public genUndoRedoButtons(): JQElement {
        let buttons = $("<div/>");

        buttons.append(
            $("<input/>", {
                type: "button",
                id: "undo",
                class: "button primary undo",
                value: "Undo",
                disabled: true,
            })
        );
        buttons.append(
            $("<input/>", {
                type: "button",
                id: "redo",
                class: "button primary redo",
                value: "Redo",
                disabled: true,
            })
        );
        return buttons.children();
    }
    public genPreCommands(): JQElement {
        return null;
    }
    /**
     * Set up the UI elements for the result fields
     */
    public genPostCommands(): JQuery<HTMLElement> {
        return null;
    }
    /**
     * Initializes any layout of the handler.
     */
    public buildCustomUI(): void {
        $(".MenuBar").each((i: number, elem: HTMLElement) => {
            $(elem).replaceWith(this.createMainMenu());
        });
        $(".precmds").each((i, elem) => {
            $(elem).replaceWith(this.genPreCommands());
        });
        $(".postcmds").each((i, elem) => {
            $(elem).replaceWith(this.genPostCommands());
        });
        $(".cmdbuttons").each((i, elem) => {
            $(elem).replaceWith(this.genCmdButtons());
        });
        $(".langsel").each((i: number, elem: HTMLElement) => {
            $(elem).replaceWith(this.getLangDropdown());
        });
    }
    public restore(data: IState): void {}
    public save(): IState {
        return { cipherType: ICipherType.None, cipherString: "" };
    }
    /**
     * Saves the current state of the cipher work so that it can be undone
     * This code will attempt to merge named operations when pushing a second
     * to the top of the stack.  This is useful for operations such as search
     * undotype Type of undo (for merging with previous entries).  A value of
     * null indicates that the operation is not mergable.
     */
    public markUndo(undotype: string): void {
        // See if we are trying to do an undo after we had popped some undo
        // operations off the stack.  In that case, we simply truncate the stack
        if (this.undoPosition < this.undoStack.length - 1) {
            this.undoStack.splice(this.undoPosition);
        }
        this.pushUndo(undotype);
        // If we attempt to do an undo after we pushed this operation of the stack
        // remember that we will have to save whatever this operation was so that
        // we don't lose it as undo is always the state BEFORE the operation
        this.undoNeeded = undotype;
        this.markUndoUI(false, true);
    }
    /**
     * Pushes or merges an undo operation to the top of the stack
     * undotype Type of undo (for merging with previous entries)
     * For example if we have the following operations
     *    Operation          UndoType  Action Stack after
     *    Initial State                       <empty>
     *    Change Offset=1    undefined  push  [initial]
     *    Type find char A   find       push  [initial][off=1]
     *    Type find char AB  find       push  [initial][off=1][find=A,off=1]
     *    Type find char ABC find       merge [initial][off=1][find=AB,off=1]
     *    Change Offset=2    undefined  merge [initial][off=1][find=ABC,off=1]
     *    Change Offset=3    undefined  push  [initial][off=1][find=ABC,off=1][find=ABC,off=2]
     */
    public pushUndo(undotype: string): void {
        let undodata = this.save();
        // See if we can merge this (such as a find operation) with the previous undo
        if (this.undoCanMerge) {
            this.undoStack[this.undoStack.length - 1] = undodata;
        } else {
            this.undoStack.push(undodata);
        }
        this.undoPosition = this.undoStack.length - 1;
        // Now remember what we did so that we can figure out if next time we
        // can merge
        this.undoCanMerge =
            this.lastUndoRequest !== undefined &&
            this.lastUndoRequest !== null &&
            this.lastUndoRequest === undotype;
        // Remember the current request so we can check on merging next time
        this.lastUndoRequest = undotype;
    }
    /**
     * Restore work to a previous state stored on the stack
     */
    public unDo(): void {
        // Note that if we are at the top of the undo stack, we have to push
        // a new entry so that they can get back to where they are
        if (this.undoNeeded !== undefined) {
            this.pushUndo(this.undoNeeded);
            this.undoNeeded = undefined;
        }
        this.undoCanMerge = false;
        this.lastUndoRequest = undefined;
        if (this.undoPosition > 0) {
            this.undoPosition--;
            this.restore(this.undoStack[this.undoPosition]);
            this.markUndoUI(this.undoPosition <= 0, false);
        }
    }
    public markUndoUI(undostate: boolean, redostate: boolean): void {
        if (redostate) {
            $(".redo").addClass("disabled_menu");
            $(".redo").attr("disabled", "disabled");
        } else {
            $(".redo").removeClass("disabled_menu");
            $(".redo").removeAttr("disabled");
        }
        if (undostate) {
            $(".undo").addClass("disabled_menu");
            $(".undo").attr("disabled", "disabled");
        } else {
            $(".undo").removeClass("disabled_menu");
            $(".undo").removeAttr("disabled");
        }
    }

    /**
     * Redo work (i.e. undo an undo)
     */
    public reDo(): void {
        if (this.undoPosition < this.undoStack.length - 1) {
            this.undoPosition++;
            this.restore(this.undoStack[this.undoPosition]);
            this.undoNeeded = undefined;
            // Prevent creating a new entry on the stack since it will match
            // what we have currently
            this.undoCanMerge = true;
            this.lastUndoRequest = undefined;
            this.markUndoUI(
                false,
                this.undoPosition >= this.undoStack.length - 1
            );
        }
    }
    public setMenuMode(mode: menuMode): void {
        this.activeToolMode = toolMode.codebusters;
        switch (mode) {
            case menuMode.aca:
                $(".menufile").show();
                $(".menuaca").show();
                $(".menucb").hide();
                this.activeToolMode = toolMode.aca;
                break;
            case menuMode.test:
                $(".menufile").hide();
                $(".menuaca").hide();
                $(".menucb").show();
                this.activeToolMode = toolMode.codebusters;
                break;
            case menuMode.question:
                $(".menufile").show();
                $(".menuaca").hide();
                $(".menucb").show();
                this.activeToolMode = toolMode.codebusters;
                break;
            default:
                $(".menufile").hide();
                $(".menuaca").show();
                $(".menucb").show();
                // Don't change the activeToolMode since it might be either
                break;
        }
        this.initToolModeSettings();
    }
    /**
     * Updates the initial user interface for the cipher handler.  This is a one
     * time operation.  If the editEntry paramter is passed on the URL, then that
     * entry is loaded and the cipher is initialized with it as if it were loaded
     * from the menu.  Any additional URL parameters are parsed and passed in as
     * the initial state values.
     */
    public layout(): void {
        let parms = parseQueryString(window.location.search.substring(1));
        let saveSet = this.save();
        this.savefileentry = -1;
        if (parms.editEntry !== undefined) {
            // They gave us an entry to load, so start out with it
            this.savefileentry = Number(parms.editEntry);
            saveSet = this.getFileEntry(this.savefileentry);
        }
        // Copy over any additional parameters they might have given
        for (let v in parms) {
            if (parms.hasOwnProperty(v)) {
                saveSet[v] = parms[v];
            }
        }
        this.buildCustomUI();
        this.setMenuMode(menuMode.none);
        this.restore(saveSet);
        this.attachHandlers();
    }
    /**
     * Cleans up any settings, range checking and normalizing any values.
     * This doesn't actually update the UI directly but ensures that all the
     * values are legitimate for the cipher handler
     * Generally you will call updateOutput() after calling setUIDefaults()
     */
    public setUIDefaults(): void {}
    /**
     * Update the output based on current state settings.  This propagates
     * All values to the UI
     */
    public updateOutput(): void {}
    /**
     * Builds the output for the current state data.
     */
    public build(): JQElement {
        return null;
    }

    /**
     * Create an edit field for a dropdown
     */
    public makeFreqEditField(c: string): JQElement {
        return null;
    }
    /**
     * Handle a dropdown event.  They are changing the mapping for a character.
     * Process the change, but first we need to swap around any other character which
     * is using what we are changing to.
     */
    public updateSel(item: string, val: string): void {}
    /**
     * Adds a set of answer rows to a table.
     *   overline specifies answer characters (typically from a vigenere or running key)
     *    that someone would use to compute the answer.  undefined indicates not to use it
     *   cipher line is the line that they are being asked to encode/decode
     *   answerline is the answer (if any).  undefined to leave it blank
     *   blankline chooses to add an extra line to the table or not.
     */
    public addCipherTableRows(
        table: JTTable,
        overline: string,
        cipherline: string,
        answerline: string,
        blankline: boolean
    ): void {
        let rowover;
        if (overline !== undefined) {
            rowover = table.addBodyRow();
        }
        let rowcipher = table.addBodyRow();
        let rowanswer = table.addBodyRow();
        let rowblank = table.addBodyRow();

        for (let i = 0; i < cipherline.length; i++) {
            let c = cipherline.substr(i, 1);
            let aclass = "e v";
            let a = " ";
            if (answerline !== undefined) {
                a = answerline.substr(i, 1);
                aclass = "a v";
            }
            if (overline !== undefined) {
                if (this.isValidChar(c)) {
                    rowover.add({
                        settings: { class: "o v" },
                        content: overline.substr(i, 1),
                    });
                } else {
                    rowover.add(overline.substr(i, 1));
                }
            }
            if (this.isValidChar(c)) {
                rowcipher.add({
                    settings: { class: "q v" },
                    content: c,
                });
                rowanswer.add({
                    settings: { class: aclass },
                    content: a,
                });
            } else {
                if (answerline === undefined) {
                    a = c;
                }
                rowcipher.add(c);
                rowanswer.add(a);
            }
            rowblank.add("");
        }
        return;
    }
    /**
     * Generate the HTML to display the answer for a cipher
     */
    public genAnswer(): JQElement {
        return $("<h3>").text(
            "This cipher does not support printing the Answer yet"
        );
    }
    /**
     * Generate the HTML to display the question for a cipher
     */
    public genQuestion(): JQElement {
        return $("<h3>").text(
            "This cipher does not support printing the Question yet"
        );
    }
    /**
     * Change the encrypted character.  Note that when we change one, we have
     * to swap it with the one which we are replacing
     * @param repchar Character that is being replaced
     * @param newchar Character to replace it with
     * @param elem Optional HTML Element triggering the request
     */
    public setChar(
        repchar: string,
        newchar: string,
        elem?: JQuery<HTMLElement>
    ): void {
        // console.log("handler setChar data-char=" + repchar + " newchar=" + newchar)
        // See if any other slots have this character and reset it
        if (newchar !== "") {
            for (let i in this.state.replacement) {
                if (this.state.replacement[i] === newchar && i !== repchar) {
                    this.setChar(i, "");
                }
            }
        }
        this.state.replacement[repchar] = newchar;
        $("input[data-char='" + repchar + "']").val(newchar);
        if (newchar === "") {
            newchar = "?";
        }
        $("span[data-char='" + repchar + "']").text(newchar);
        if (!this.holdupdates) {
            this.UpdateReverseReplacements();
            this.updateMatchDropdowns(repchar);
        }
    }
    /**
     * Change multiple characters at once.
     */
    public setMultiChars(reqstr: string): void {}
    /**
     * Update all of the match dropdowns in response to a change in the cipher mapping
     */
    public updateMatchDropdowns(reqstr: string): void {}
    /**
     * Locate a string and update the results
     */
    public findPossible(str: string): void {}
    /**
     * Generate a solving aid for a cipher
     */
    public genSolution(): JQElement {
        return null;
    }
    /**
     * Eliminate the non displayable characters and replace them with a space
     */
    public cleanString(str: string): string {
        let pattern: string = "[\r\n ]+";
        let re = new RegExp(pattern, "g");
        return str.replace(re, " ");
    }
    /**
     * Eliminate all characters which are not in the charset
     */
    public minimizeString(str: string): string {
        let res: string = "";
        for (let c of str.toUpperCase()) {
            if (this.isValidChar(c)) {
                res += c;
            }
        }
        return res;
    }
    /**
     * Convert the text to chunks of (chunkSize) characters separated
     * by a space.  Just keep characters that are in the character set and
     * remove all punctuation, etc.
     * Note: the string could be toUpperCase()'d here, but it is done later.
     */
    public chunk(inputString: string, chunkSize: number): string {
        let chunkIndex = 1;
        let charset = this.getCharset();
        let chunkedString = "";
        for (let c of inputString) {
            // Skip anthing that is not in the character set (i.e spaces,
            // punctuation, etc.)
            if (charset.indexOf(c.toUpperCase()) < 0) {
                continue;
            }

            // Test for a chunk boundary using modulo of chunk size.
            if (chunkIndex % (chunkSize + 1) === 0) {
                chunkedString += " ";
                chunkIndex = 1;
            }

            // Store the character in the chunk representation.
            chunkedString += c;
            chunkIndex++;
        }
        return chunkedString;
    }
    /**
     * Sets the character set used by the Decoder.
     */
    public setCharset(charset: string): void {
        this.charset = charset;
    }
    /**
     * Determines if a character is part of the valid character set for the cipher
     */
    public isValidChar(char: string): boolean {
        return this.charset.indexOf(char) >= 0;
    }
    /**
     * Gets the current character set used for output of the cipher
     */
    public getCharset(): string {
        return this.charset;
    }
    /**
     * Gets the character set to be use for encoding.
     */
    public getSourceCharset(): string {
        return this.sourcecharset;
    }
    /**
     * Sets the character set to be use for encoding.
     */
    public setSourceCharset(charset: string): void {
        this.sourcecharset = charset;
    }
    /**
     * Update the frequency table on the page.  This is done after loaading
     * a new cipher to encode or decode
     */
    public UpdateFreqEditTable(): void {
        $(".freq").each((i: number, elem: HTMLElement) => {
            $(elem)
                .empty()
                .append(this.createFreqEditTable());
        });
        this.attachHandlers();
    }
    public getReverseReplacement(): StringMap {
        let revRepl: StringMap = {};
        // Build a reverse replacement map so that we can encode the string
        for (let repc in this.state.replacement) {
            if (this.state.replacement.hasOwnProperty(repc)) {
                revRepl[this.state.replacement[repc]] = repc;
            }
        }
        return revRepl;
    }
    /**
     * Using the currently selected replacement set, encodes a string
     * This breaks it up into lines of maxEncodeWidth characters or less so that
     * it can be output properly.
     * This returns the strings as an array of pairs of strings with
     * the encode and decode parts delivered together.  As a side effect
     * it also updates the frequency table
     */
    public makeReplacement(str: string, maxEncodeWidth: number): string[][] {
        let charset = this.getCharset();
        let sourcecharset = this.getSourceCharset();
        let revRepl = this.getReverseReplacement();
        let langreplace = this.langreplace[this.state.curlang];
        let encodeline = "";
        let decodeline = "";
        let lastsplit = -1;
        let result: string[][] = [];

        // Zero out the frequency table
        this.freq = {};
        for (let i = 0, len = sourcecharset.length; i < len; i++) {
            this.freq[sourcecharset.substr(i, 1).toUpperCase()] = 0;
        }
        // Now go through the string to encode and compute the character
        // to map to as well as update the frequency of the match
        for (let t of str.toUpperCase()) {
            // See if the character needs to be mapped.
            if (typeof langreplace[t] !== "undefined") {
                t = langreplace[t];
            }
            decodeline += t;
            // Make sure that this is a valid character to map from
            let pos = charset.indexOf(t);
            if (pos >= 0) {
                t = revRepl[t];
                if (isNaN(this.freq[t])) {
                    this.freq[t] = 0;
                }
                this.freq[t]++;
            } else if (t !== "'") {
                // This is a potential split position, so remember it
                lastsplit = decodeline.length;
            }
            encodeline += t;
            // See if we have to split the line now
            if (encodeline.length >= maxEncodeWidth) {
                if (lastsplit === -1) {
                    result.push([encodeline, decodeline]);
                    encodeline = "";
                    decodeline = "";
                    lastsplit = -1;
                } else {
                    let encodepart = encodeline.substr(0, lastsplit);
                    let decodepart = decodeline.substr(0, lastsplit);
                    encodeline = encodeline.substr(lastsplit);
                    decodeline = decodeline.substr(lastsplit);
                    result.push([encodepart, decodepart]);
                }
            }
        }
        // And put together any residual parts
        if (encodeline.length > 0) {
            result.push([encodeline, decodeline]);
        }
        return result;
    }
    /**
     * Make multiple copies of a string concatenated
     * c Character (or string) to repeat
     * count number of times to repeat the string
     */
    public repeatStr(c: string, count: number): string {
        let res = "";
        for (let i = 0; i < count; i++) {
            res += c;
        }
        return res;
    }
    /**
     * Calculates the Chi Square value for a cipher string against the current
     * language character frequency
     */
    public CalculateChiSquare(str: string): number {
        let charset = this.getCharset();
        let len = charset.length;
        let counts = new Array(len);
        let total = 0;
        for (let i = 0; i < len; i++) {
            counts[i] = 0;
        }
        for (let i = 0; i < str.length; i++) {
            let c = str.substr(i, 1).toUpperCase();
            let pos = charset.indexOf(c);
            if (pos >= 0) {
                counts[pos]++;
                total++;
            }
        }
        let chiSquare = 0.0;
        for (let i = 0; i < len; i++) {
            let c = charset.substr(i, 1);
            let expected = this.langfreq[this.state.curlang][c];
            if (expected !== undefined && expected !== 0) {
                chiSquare +=
                    Math.pow(counts[i] - total * expected, 2) /
                    (total * expected);
            }
        }
        return chiSquare;
    }
    /**
     * Calculates the Chi Square value for a cipher string against the current
     * language character frequency
     */
    public CalculateCribChiSquare(matchfreq: NumberMap): number {
        let charset = this.getCharset();
        let len = charset.length;
        let counts = new Array(len);
        let total = 0;
        for (let val in this.freq) {
            total += this.freq[val];
        }
        let chiSquare = 0.0;
        for (let c in matchfreq) {
            let expected = this.langfreq[this.state.curlang][c];
            if (expected !== undefined && expected !== 0) {
                chiSquare +=
                    Math.pow(matchfreq[c] - total * expected, 2) /
                    (total * expected);
            }
        }
        return chiSquare;
    }
    /**
     * Analyze the encoded text and update the UI output
     */
    public genAnalysis(encoded: string): JQElement {
        return null;
    }
    /**
     * Process a menu action string
     */
    public doAction(action: string): void {
        switch (action) {
            case "new":
                this.newCipher();
                break;

            case "open":
                this.openCipher();
                break;

            case "save":
                this.saveCipher();
                break;

            case "saveas":
                this.saveCipherAs();
                break;

            case "submit":
                this.submit();
                break;

            case "undo":
                this.unDo();
                break;

            case "redo":
                this.reDo();
                break;

            case "copy":
                this.copy();
                break;

            case "about":
                this.about();
                break;

            case "guidance":
                this.guidance();
                break;

            default:
                console.log("Unknown action: " + action);
                break;
        }
    }

    /**
     * Fills in the frequency portion of the frequency table
     */
    public displayFreq(): void {
        let charset = this.getCharset();
        this.holdupdates = true;
        for (let c in this.freq) {
            if (this.freq.hasOwnProperty(c)) {
                let subval: string = String(this.freq[c]);
                if (subval === "0") {
                    subval = "";
                }
                $("#f" + c).text(subval);
            }
        }
        for (let c in this.state.replacement) {
            let r = this.state.replacement[c];
            $("#m" + c).text(r);
            $("#rf" + r).text(c);
        }
        this.holdupdates = false;
        this.updateMatchDropdowns("");
    }
    /**
     * Generate a replacement pattern string.  Any unknown characters are represented as a space
     * otherwise they are given as the character it replaces as.
     *
     * For example if we know
     *    A B C D E F G J I J K L M N O P Q R S T U V W X Y Z
     *        E             H
     *
     * And were given the input string of "RJCXC" then the result would be " HE E"
     */
    public genReplPattern(str: string): string[] {
        let res = [];
        for (let c of str) {
            if (this.state.replacement[c] === undefined) {
                res.push("");
            } else {
                res.push(this.state.replacement[c]);
            }
        }
        return res;
    }
    /**
     * Determines if a string is a valid match for the known matching characters
     * This is used to generate the candidates in the dropdown dialog
     */
    public isValidReplacement(
        str: string,
        repl: string[],
        used: BoolMap
    ): boolean {
        //   console.log(str)
        for (let i = 0, len = str.length; i < len; i++) {
            let c = str.substr(i, 1);
            if (repl[i] !== "") {
                if (c !== repl[i]) {
                    //             console.log("No match c=" + c + " repl[" + i + "]=" + repl[i])
                    return false;
                }
            } else if (used[c]) {
                //          console.log("No match c=" + c + " used[c]=" + used[c])
                return false;
            }
        }
        return true;
    }
    public setDefaultCipherType(ciphertype: ICipherType): void {
        this.state.cipherType = ciphertype;
        this.defaultstate.cipherType = ciphertype;
    }
    /**
     * Updates the stored state cipher string
     * @param cipherString Cipher string to set
     */
    public setCipherString(cipherString: string): boolean {
        let changed = false;
        if (this.state.cipherString !== cipherString) {
            this.state.cipherString = cipherString;
            changed = true;
        }
        return changed;
    }
    /**
     * set the cipher type
     */
    public setCipherType(ciphertype: ICipherType): boolean {
        let changed = false;
        if (this.state.cipherType !== ciphertype) {
            this.state.cipherType = ciphertype;
            changed = true;
        }
        return changed;
    }
    /**
     * Quote a string, escaping any quotes with \.  This is used for generating Javascript
     * that can be safely loaded.
     */
    public quote(str: string): string {
        if (typeof str === "undefined") {
            return "\"\"";
        }
        return "'" + str.replace(/([""])/g, "\\$1") + "'";
    }
    /**
     * Given a string with groupings of a size, this computes a pattern which matches the
     * string in a unique order.
     * for example for makeUniquePattern("XYZZY",1)
     *                 it would generate "01221"
     * with  makeUniquePattern("..--X..X..X",2)
     *                          0 1 2 3 0 4   (note the hidden addition of the extra X)
     * This makes it easy to search for a pattern in any input cryptogram
     */
    public makeUniquePattern(str: string, width: number): string {
        let cmap = {};
        let res = "";
        let mapval: number = 0;
        let len = str.length;
        // in case they give us an odd length string, just padd it with enough Xs
        str += "XXXX";

        for (let i = 0; i < len; i += width) {
            let c = str.substr(i, width);
            if (typeof cmap[c] === "undefined") {
                cmap[c] = mapval.toString(36).toUpperCase();
                mapval++;
            }
            res += cmap[c];
        }
        return res;
    }
    /**
     * Dump out the language template for a given language
     */
    public dumpLang(lang: string): string {
        let extra = "";
        let res = "cipherTool.Frequent[" + this.quote(lang) + "]={";
        for (let pat in this.Frequent[lang]) {
            if (this.Frequent[lang].hasOwnProperty(pat) && pat !== "") {
                res += extra + '"' + pat + '":[';
                let extra1 = "";
                let matches = this.Frequent[lang][pat];
                for (let i = 0, len = matches.length; i < len; i++) {
                    // console.log(matches[i])
                    res +=
                        extra1 +
                        "[" +
                        this.quote(matches[i][0]) +
                        "," +
                        matches[i][1] +
                        "," +
                        matches[i][2] +
                        "," +
                        matches[i][3] +
                        "]";
                    extra1 = ",";
                }
                res += "]";
                extra = ",";
            }
        }
        res += "};";
        return res;
    }
    /**
     * Fills in the language choices on an HTML Select
     */
    public getLangDropdown(): JQElement {
        $("#loadeng").hide();
        let result = $("<div/>", { class: "cell input-group" });
        result.append(
            $("<span/>", {
                class: "input-group-label",
            }).text("Language")
        );
        let select = $("<select/>", {
            class: "lang input-group-field",
        });
        select.append(
            $("<option />", {
                value: "",
            }).text("--Select a language--")
        );
        for (let lang in this.langmap) {
            if (this.langmap.hasOwnProperty(lang)) {
                select.append(
                    $("<option />", {
                        value: lang,
                    }).text(this.langmap[lang])
                );
            }
        }
        result.append(select);
        return result;
    }
    /**
     * Loads a language in response to a dropdown event
     */
    public loadLanguage(lang: string): void {
        $("#loadeng").hide();
        this.state.curlang = lang;
        this.setCharset(this.langcharset[lang]);
        this.showLangStatus(
            "warning",
            "Attempting to load " + this.langmap[lang] + "..."
        );
        $.getScript("Languages/" + lang + ".js", (data, textStatus, jqxhr) => {
            this.showLangStatus("secondary", "");
            this.updateMatchDropdowns("");
        }).fail((jqxhr, settings, exception) => {
            console.log("Complied language file not found for " + lang + ".js");
            this.loadRawLanguage(lang);
        });
    }
    /**
     * Loads a raw language from the server
     * lang Language to load (2 character abbreviation)
     */
    public loadRawLanguage(lang: string): void {
        let jqxhr = $.get("Languages/" + lang + ".txt", () => {}).done(data => {
            // empty out all the frequent words
            this.showLangStatus(
                "warning",
                "Processing " + this.langmap[lang] + "..."
            );
            this.Frequent[lang] = {};
            this.state.curlang = lang;
            let charset = this.langcharset[lang];
            let langreplace = this.langreplace[lang];
            this.setCharset(charset);
            let lines = data.split("\n");
            let len = lines.length;
            charset = charset.toUpperCase();
            for (let i = 0; i < len; i++) {
                let pieces = lines[i]
                    .replace(/\r/g, " ")
                    .toUpperCase()
                    .split(/ /);
                // make sure that all the characters in the pieces are valid
                // for this character set.  Otherwise we can throw it away
                let legal = true;
                for (let c of pieces[0]) {
                    if (charset.indexOf(c) < 0) {
                        if (typeof langreplace[c] === "undefined") {
                            console.log(
                                "skipping out on " +
                                    pieces[0] +
                                    " for " +
                                    c +
                                    " against " +
                                    charset
                            );
                            legal = false;
                            break;
                        }
                        pieces[0] = pieces[0].replace(c, langreplace[c]);
                    }
                }
                if (legal) {
                    let pat = this.makeUniquePattern(pieces[0], 1);
                    let elem: patelem = [
                        pieces[0].toUpperCase(),
                        i,
                        pieces[1],
                        0,
                    ];
                    if (i < 500) {
                        elem[3] = 0;
                    } else if (i < 1000) {
                        elem[3] = 1;
                    } else if (i < 2000) {
                        elem[3] = 3;
                    } else if (i < 5000) {
                        elem[3] = 4;
                    } else {
                        elem[3] = 5;
                    }
                    if (typeof this.Frequent[lang][pat] === "undefined") {
                        this.Frequent[lang][pat] = [];
                    }
                    this.Frequent[lang][pat].push(elem);
                }
            }
            // console.log(this.Frequent)
            $(".langout").each((i: number, elem: HTMLElement) => {
                this.showLangStatus(
                    "warning",
                    "Dumping " + this.langmap[lang] + "..."
                );
                $(elem).text(this.dumpLang(lang));
            });
            this.showLangStatus("secondary", "");
            this.updateMatchDropdowns("");
        });
        this.showLangStatus("warning", "Loading " + this.langmap[lang] + "...");
    }
    /**
     * Updates the language status message box with a message (or clears it)
     * @param calloutclass Class of the callout
     * @param msg Message to be displayed
     */
    public showLangStatus(
        calloutclass: "secondary" | "primary" | "success" | "warning" | "alert",
        msg: string
    ): void {
        $(".langstatus").empty();
        if (msg !== "") {
            $(".langstatus").append(
                $("<div/>", {
                    class: "callout " + calloutclass,
                    "data-closable": "",
                }).text(msg)
            );
        }
    }

    /**
     * Retrieve all of the replacement characters that have been selected so far
     */
    public UpdateReverseReplacements(): void {
        let charset = this.getSourceCharset().toUpperCase();
        $("[id^=rf]").text("");
        for (let c of charset) {
            $("#rf" + this.state.replacement[c]).text(c);
        }
    }
    /**
     * Get a URL associated with an editor for a saved cipher
     * @param state Saved cipher
     */
    public getEditURL(state: IState): string {
        let lang;
        if (state.cipherType === undefined) {
            return "";
        }
        if (state.curlang !== undefined && state.curlang !== "en") {
            lang = state.curlang;
        }
        return JTGetURL(CipherMenu, state.cipherType, lang);
    }
    /**
     * Gte a URL associated with a solver for a saved cipher
     * @param state Saved cipher
     */
    public getSolveURL(state: IState): string {
        let lang;
        if (state.cipherType === undefined) {
            return "";
        }
        return JTGetSolveURL(CipherMenu, state.cipherType);
    }
    /**
     * Create the hidden dialog for selecting a cipher to open
     */
    private createOpenFileDlg(): JQElement {
        let dlgContents = $("<select/>", {
            id: "files",
            class: "filelist",
            size: 10,
        });
        let openFileDlg = JTFDialog(
            "OpenFile",
            "Select File to Open",
            dlgContents,
            "okopen",
            "OK"
        );
        return openFileDlg;
    }
    /**
     * Creates the hidden dialog for selecting an XML file to import
     */
    private createImportFileDlg(): JQElement {
        let dlgContents = $("<div/>", {
            id: "importstatus",
            class: "callout secondary",
        })
            .append(
                $("<label/>", {
                    for: "xmlFile",
                    class: "impfile button",
                }).text("Select File")
            )
            .append(
                $("<input/>", {
                    type: "file",
                    id: "xmlFile",
                    accept: ".json",
                    class: "impfile show-for-sr",
                })
            )
            .append(
                $("<span/>", {
                    id: "xmltoimport",
                    class: "impfile",
                }).text("No File Selected")
            )
            .append(
                JTFLabeledInput(
                    "URL",
                    "text",
                    "xmlurl",
                    "",
                    "impurl small-12 medium-6 large-6"
                )
            );
        let importDlg = JTFDialog(
            "ImportFile",
            "Import Test Data",
            dlgContents,
            "okimport",
            "Import"
        );
        return importDlg;
    }
    /**
     * Creates the hidden dialog showing version/build information
     */
    public createAboutDlg(): JQElement {
        let dlgContents = $('<table class="version-table"/>');
        dlgContents.append(
            '<tr class="version"><td>Version:</td><td>' +
                getVersion() +
                "</td></tr>"
        );
        dlgContents.append(
            '<tr class="latest-version"><td>Latest version:</td><td><span class="remote-version">Unknown</span></td></tr>'
        );
        dlgContents.append(
            "<tr><td>Built  :</td><td>[AIV]{date}[/AIV]</td></tr>"
        );

        let aboutDlg = JTFDialog(
            "About",
            "Cipher Tools",
            dlgContents,
            "okdownload",
            "Download latest version"
        );
        return aboutDlg;
    }
    /**
     * Create the main menu at the top of the page.
     * This also creates the hidden dialogs used for opening and importing files
     */
    public createMainMenu(): JQElement {
        let result = $("<div/>");
        result.append(JTCreateMenu(CipherMenu, "example-menu", "Cipher Tools"));
        // Create the dialog for selecting which cipher to load
        result.append(this.createOpenFileDlg());
        result.append(this.createImportFileDlg());
        result.append(this.createAboutDlg());
        return result;
    }
    /**
     * Preserve the current replacement order
     */
    public getReplacementOrder(): void {
        let replOrder = "";
        $("#freqtable")
            .children()
            .each((i, elem) => {
                let eid = $(elem).attr("id");
                replOrder += eid.substr(eid.length - 1);
            });
        this.state.replOrder = replOrder;
    }
    public guidance(): void {
        window.open(this.guidanceURL, "guidance");
    }
    /**
     * Show the about dialog.  If served from file:// (i.e. running
     * local), try to contact the server and get the online version.
     * If online is newer, enable download button for zip file.
     */
    public about(): void {
        let served_from = window.location.href;
        let local_version = getVersion();
        console.log("Local version: " + local_version);
        console.log("served from: " + served_from.substring(0, 4));
        $(".version-table tr.latest-version").hide();
        if (served_from.substring(0, 5) === "file:") {
            this.getWebVersion(local_version);
            $(".version-table tr.latest-version").show();
        } else {
            // Enable the download button...
            $("#okdownload").removeAttr("disabled");
            this.download();
        }

        $("#About").foundation("open");
    }

    /**
     * Download the zip file is the 'download' button is not disabled
     */
    public download(): void {
        $("#okdownload")
            .off("click")
            .on("click", e => {
                if (!$("#okdownload").prop("disabled")) {
                    console.log(
                        "disable download prop: >" +
                            $("#okdownload").prop("disabled") +
                            "<"
                    );
                    e.preventDefault();
                    window.location.href =
                        "https://toebes.com/codebusters/CipherTools.zip";
                }
            });
    }

    /**
     * Download the zip file of the site.  Overall design of this goes like:
     *
     *   // check if running from file system
     *   // = true - try to phone home.
     *   //   = true - get version file
     *   //     is version at home > local version
     *   //     = true - download
     *   //     = else - OK dialog "@ latest level"
     *   //   = else - nothing to do
     *   // = else - do the download
     */
    public getWebVersion(local_version: string): void {
        console.log("Handle request to get Web version....");
        let remote_version = "0.0.0";
        // Phone home
        // test from: "http://192.168.109.10:10980/dist/siteVersion.txt"
        $.ajax({
            url: "https://toebes.com/codebusters/siteVersion.txt",
            dataType: "jsonp",
            jsonpCallback: "getVersion",
            success: function(a: any, b: string, c: JQueryXHR): void {
                console.log("A Success " + JSON.stringify(a));
                console.log("B Success " + b);
                console.log("C Success " + c);
                remote_version = a["version"];
                console.log("Set remote version to: " + remote_version);
            },
            error: function(a: JQueryXHR, b: string, c: string): void {
                console.log("A Error " + JSON.stringify(a));
                console.log("B Error " + b);
                console.log("C Error " + c);
                console.log("Disable the download button...");
                $("#okdownload").prop("disabled", true);
            },
        }).done(function(a: any, b: string, c: JQueryXHR): void {
            $(".remote-version").html(remote_version);
            // enable the down load buttin if appropriate
            console.log("Enable download button?");
            if (remote_version > local_version) {
                console.log("remove disable attrib, to enable download button");
                $("#okdownload").removeAttr("disabled");
            } else {
                console.log("Disable the download button...");
                $("#okdownload").prop("disabled", true);
            }
        });

        console.log("Remote version: " + remote_version);
        console.log("Local version: " + local_version);
        this.download();
    }

    /**
     * Set up all the HTML DOM elements so that they invoke the right functions
     */
    public attachHandlers(): void {
        $(".sli")
            .off("keyup")
            .on("keyup", event => {
                let target = $(event.target);
                let repchar = target.attr("data-char");
                let current;
                let next;
                let focusables = $(".sli");

                if (event.keyCode === 37) {
                    // left
                    current = focusables.index(event.target);
                    if (current === 0) {
                        next = focusables.last();
                    } else {
                        next = focusables.eq(current - 1);
                    }
                    next.focus();
                } else if (event.keyCode === 39) {
                    // right
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else if (event.keyCode === 46 || event.keyCode === 8) {
                    this.markUndo(null);
                    this.setChar(repchar, "", target);
                }
                event.preventDefault();
            })
            .off("keypress")
            .on("keypress", event => {
                let newchar;
                let target = $(event.target);
                let repchar = target.attr("data-char");
                let current;
                let next;
                let focusables = $(".sli");
                if (typeof event.key === "undefined") {
                    newchar = String.fromCharCode(event.keyCode).toUpperCase();
                } else {
                    newchar = event.key.toUpperCase();
                }

                if (this.isValidChar(newchar) || newchar === " ") {
                    if (newchar === " ") {
                        newchar = "";
                    }
                    console.log("Setting " + repchar + " to " + newchar);
                    this.markUndo(null);
                    this.setChar(repchar, newchar, target);
                    current = focusables.index(event.target);
                    next = focusables.eq(current + 1).length
                        ? focusables.eq(current + 1)
                        : focusables.eq(0);
                    next.focus();
                } else {
                    console.log("Not valid:" + newchar);
                }
                event.preventDefault();
            })
            .off("blur")
            .on("blur", e => {
                let tohighlight = $(e.target).attr("data-char");
                $("[data-char='" + tohighlight + "']").removeClass("allfocus");
                let althighlight = $(e.target).attr("data-schar");
                if (althighlight !== "") {
                    $("[data-schar='" + althighlight + "']").removeClass(
                        "allfocus"
                    );
                }
                $(e.target).removeClass("focus");
            })
            .off("focus")
            .on("focus", e => {
                let tohighlight = $(e.target).attr("data-char");
                $("[data-char='" + tohighlight + "']").addClass("allfocus");
                let althighlight = $(e.target).attr("data-schar");
                if (althighlight !== "") {
                    $("[data-schar='" + althighlight + "']").addClass(
                        "allfocus"
                    );
                }
                $(e.target).addClass("focus");
            });
        $('[name="operation"]')
            .off("click")
            .on("click", e => {
                $(e.target)
                    .siblings()
                    .removeClass("is-active");
                $(e.target).addClass("is-active");
                this.markUndo(null);
                this.setOperation($(e.target).val() as IOperationType);
                this.updateOutput();
            });
        $(".input-number-increment")
            .off("click")
            .on("click", e => {
                let $input = $(e.target)
                    .parents(".input-group")
                    .find(".input-number");
                let val = Number($input.val());
                this.advancedir = 1;
                $input.val(val + this.advancedir);
                $input.trigger("input");
            });
        $(".input-number-decrement")
            .off("click")
            .on("click", e => {
                let $input = $(e.target)
                    .parents(".input-group")
                    .find(".input-number");
                let val = Number($input.val());
                this.advancedir = -1;
                $input.val(val + this.advancedir);
                $input.trigger("input");
            });
        $('[name="ciphertype"]')
            .off("click")
            .on("click", e => {
                $(e.target)
                    .siblings()
                    .removeClass("is-active");
                $(e.target).addClass("is-active");
                this.markUndo(null);
                this.setCipherType($(e.target).val() as ICipherType);
                this.updateOutput();
            });
        $("#load")
            .off("click")
            .on("click", () => {
                this.markUndo(null);
                this.load();
            });
        $("#undo")
            .off("click")
            .on("click", () => {
                this.unDo();
            });
        $("#redo")
            .off("click")
            .on("click", () => {
                this.reDo();
            });
        $("#save")
            .off("click")
            .on("click", () => {
                this.saveCipher();
            });
        $("#reset")
            .off("click")
            .on("click", () => {
                this.markUndo(null);
                this.reset();
            });
        $("a[data-action]")
            .off("click")
            .on("click", e => {
                if ($(e.target).hasClass("disabled_menu")) {
                    e.preventDefault();
                } else {
                    this.doAction($(e.target).attr("data-action"));
                }
            });
        $(".msli")
            .off("change")
            .on("change", e => {
                this.markUndo(null);
                let toupdate = $(e.target).attr("data-char");
                this.updateSel(toupdate, (e.target as HTMLInputElement).value);
            });
        $(".lang")
            .off("change")
            .on("change", e => {
                this.loadLanguage($(e.target).val() as string);
            });
        $("#find")
            .off("input")
            .on("input", e => {
                this.markUndo("find");
                let findStr = $(e.target).val() as string;
                this.findPossible(findStr);
            });
    }
}