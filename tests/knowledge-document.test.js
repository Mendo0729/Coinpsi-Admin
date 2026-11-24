import test from "node:test";
import assert from "node:assert/strict";
import {parseDriveLink,parseKeywords} from "../src/services/knowledge-document.js";
test("canonical Drive preview",()=>{assert.equal(parseDriveLink("https://drive.google.com/file/d/abcdefghijk/view?usp=sharing").preview,"https://drive.google.com/file/d/abcdefghijk/preview");});
test("reject unsafe URLs",()=>{for(const url of ["javascript:alert(1)","https://drive.google.com.evil.test/file/d/abcdefghijk/view","https://drive.google.com@evil.test/file/d/abcdefghijk/view","http://drive.google.com/file/d/abcdefghijk/view","https://drive.google.com/drive/folders/abcdefghijk"])assert.throws(()=>parseDriveLink(url));});
test("normalize keywords",()=>{assert.deepEqual(parseKeywords("salud, psicología, salud"),["salud","psicología"]);assert.throws(()=>parseKeywords("a".repeat(81)));});
