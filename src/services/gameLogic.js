import { answerDatabase } from '../constants/answerDatabase';


/**
 * Validates if an answer is correct based on letter match and database existence.
 * This validation happens during the comparison phase.
 * @param {string} letter - The selected letter for the round.
 * @param {string} category - The category being validated.
 * @param {string} answer - The player's answer.
 * @returns {boolean} - True if valid, false otherwise.
 */
export function validateAnswer(letter, category, answer) {
    // Empty or invalid input
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

    // Rule 3: Must exist in database for the specific category
    if (!answerDatabase[normalizedLetter] || !answerDatabase[normalizedLetter][category]) {
        return false;
    }

    const validList = answerDatabase[normalizedLetter][category];
    const normalizedAnswer = trimmedAnswer.toLowerCase();

    // Check if answer exists in the database for this category
    return validList.some(validItem => validItem.toLowerCase() === normalizedAnswer);
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
    // Validate both answers during comparison phase
    const p1Valid = validateAnswer(letter, category, p1Answer);
    const p2Valid = validateAnswer(letter, category, p2Answer);

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
    // Validate all answers during comparison phase
    const p1Valid = validateAnswer(letter, category, p1Answer);
    const p2Valid = validateAnswer(letter, category, p2Answer);
    const p3Valid = validateAnswer(letter, category, p3Answer);

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
