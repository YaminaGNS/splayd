import { answerDatabase } from '../constants/answerDatabase';

/**
 * Checks if a word exists in the dictionary using a free API.
 * @param {string} word - The word to check.
 * @returns {Promise<boolean>} - True if it's a real word.
 */
export async function isRealWord(word) {
    if (!word || word.length < 2) return false;
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
        return response.ok;
    } catch (error) {
        console.error("Dictionary API Error:", error);
        return false;
    }
}

/**
 * Validates if an answer matches the basic rules (letter, trimmed, length).
 * This is the synchronous part of validation.
 */
export function validateAnswer(letter, category, answer) {
    if (!answer || typeof answer !== 'string' || answer.trim() === '') {
        return false;
    }

    const normalizedLetter = letter.toUpperCase();
    const trimmedAnswer = answer.trim();
    const firstLetter = trimmedAnswer[0].toUpperCase();

    // Rule 1: Must start with the correct letter
    if (firstLetter !== normalizedLetter) {
        return false;
    }

    // Rule 2: Minimum length check
    if (trimmedAnswer.length < 2) {
        return false;
    }

    // Rule 3: Check database first (Instant validation)
    if (answerDatabase[normalizedLetter] && answerDatabase[normalizedLetter][category]) {
        const validList = answerDatabase[normalizedLetter][category];
        const normalizedAnswer = trimmedAnswer.toLowerCase();
        if (validList.some(validItem => validItem.toLowerCase() === normalizedAnswer)) {
            return true;
        }
    }

    // If not in database, we will need to check the API (handled in the component)
    return 'check_api';
}

/**
 * Gets a random valid answer from the database for the AI.
 * @param {string} letter - The starting letter.
 * @param {string} category - The category.
 * @returns {string} - A valid answer or empty string if none found.
 */
export function getAIAnswer(letter, category) {
    const normalizedLetter = letter.toUpperCase();
    if (!answerDatabase[normalizedLetter] || !answerDatabase[normalizedLetter][category]) {
        return '';
    }

    const validList = answerDatabase[normalizedLetter][category];
    if (validList.length === 0) {
        return '';
    }

    const randomIndex = Math.floor(Math.random() * validList.length);
    return validList[randomIndex];
}

/**
 * Compares answers from two players and returns points and result.
 * @param {string} p1Answer - Answer from player 1.
 * @param {string} p2Answer - Answer from player 2.
 * @param {string} letter - The required letter.
 * @param {string} category - The category.
 * @returns {object} - { p1Points, p2Points, result, p1Valid, p2Valid }
 */
export function compareAnswers(p1Answer, p2Answer, letter, category) {
    // For the final comparison, we check if they are valid.
    // If they were accepted by the UI (isRealWord check passed), they are valid.
    // So if validateAnswer returns 'check_api' during the final comparison phase,
    // it means it PASSED the real-world check earlier.
    const p1Valid = validateAnswer(letter, category, p1Answer) !== false;
    const p2Valid = validateAnswer(letter, category, p2Answer) !== false;

    let p1Points = 0;
    let p2Points = 0;
    let result = '';

    // Case 1: Neither answered or both empty
    if (!p1Answer && !p2Answer) {
        result = 'Neither answered';
    }
    // Case 2: Both invalid
    else if (!p1Valid && !p2Valid) {
        result = 'Both wrong';
    }
    // Case 3: Only P1 valid
    else if (p1Valid && !p2Valid) {
        p1Points = 10;
        result = 'P1 correct, P2 wrong';
    }
    // Case 4: Only P2 valid
    else if (!p1Valid && p2Valid) {
        p2Points = 10;
        result = 'P2 correct, P1 wrong';
    }
    // Case 5: Both valid
    else if (p1Valid && p2Valid) {
        if (p1Answer.trim().toLowerCase() === p2Answer.trim().toLowerCase()) {
            result = 'Same answer';
        } else {
            p1Points = 10;
            p2Points = 10;
            result = 'Different answers';
        }
    }

    return { p1Points, p2Points, result, p1Valid, p2Valid };
}
/**
 * Compares answers from three players and returns points and result.
 * Logic:
 * - Empty/Invalid answers = 0 pts.
 * - Same correct answer as another player = 0 pts for both.
 * - Unique correct answer = 10 pts.
 */
export function compareAnswers3P(p1Answer, p2Answer, p3Answer, letter, category) {
    const p1Valid = validateAnswer(letter, category, p1Answer) !== false;
    const p2Valid = validateAnswer(letter, category, p2Answer) !== false;
    const p3Valid = validateAnswer(letter, category, p3Answer) !== false;

    let p1Points = 0;
    let p2Points = 0;
    let p3Points = 0;

    const a1 = (p1Answer || '').trim().toLowerCase();
    const a2 = (p2Answer || '').trim().toLowerCase();
    const a3 = (p3Answer || '').trim().toLowerCase();

    // Player 1 Points
    if (p1Valid) {
        // Must be unique among other VALID answers to get points
        const matchWithP2 = p2Valid && a1 === a2;
        const matchWithP3 = p3Valid && a1 === a3;
        if (!matchWithP2 && !matchWithP3) {
            p1Points = 10;
        }
    }

    // Player 2 Points
    if (p2Valid) {
        const matchWithP1 = p1Valid && a2 === a1;
        const matchWithP3 = p3Valid && a2 === a3;
        if (!matchWithP1 && !matchWithP3) {
            p2Points = 10;
        }
    }

    // Player 3 Points
    if (p3Valid) {
        const matchWithP1 = p1Valid && a3 === a1;
        const matchWithP2 = p2Valid && a3 === a2;
        if (!matchWithP1 && !matchWithP2) {
            p3Points = 10;
        }
    }

    return {
        p1Points, p2Points, p3Points,
        valids: { p1: p1Valid, p2: p2Valid, p3: p3Valid },
        answers: { p1: p1Answer, p2: p2Answer, p3: p3Answer }
    };
}
