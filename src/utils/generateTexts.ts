import { wordList } from "../../wordList"

export function generateSentence(WORDS_IN_SENTENCE = 30): string {
    const WORDS_LENGTH = wordList.length;
    let sentence: string[] = [];

    // Generate random words
    for (let i = 0; i < WORDS_IN_SENTENCE; i++) {
        const randomIndex = Math.floor(Math.random() * WORDS_LENGTH);
        sentence.push(wordList[randomIndex]);
    }

    // Capitalize first letter and add period
    sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
    
    return sentence.join(' ') + '.';
}