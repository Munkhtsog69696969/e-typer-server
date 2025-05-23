"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSentence = generateSentence;
const wordList_1 = require("../../wordList");
function generateSentence(WORDS_IN_SENTENCE = 30) {
    const WORDS_LENGTH = wordList_1.wordList.length;
    let sentence = [];
    // Generate random words
    for (let i = 0; i < WORDS_IN_SENTENCE; i++) {
        const randomIndex = Math.floor(Math.random() * WORDS_LENGTH);
        sentence.push(wordList_1.wordList[randomIndex]);
    }
    // Capitalize first letter and add period
    sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
    return sentence.join(' ') + '.';
}
