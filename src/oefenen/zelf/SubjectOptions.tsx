import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from './zelfSessie';
import FransOptions from '../../talen/frans/FransOptions';
import { fransTopicOfId } from '../../talen/frans/fransZelf';

interface Props {
    grade: Leerjaar;
    topicId: string;
    onChoice(choice: ZelfChoice): void;
}

// A subject topic's own options screen on the Keuze screen, in place of "Welke oefening?" (Frans); nothing for a maths topic.
export default function SubjectOptions({ grade, topicId, onChoice }: Props) {
    const frans = fransTopicOfId(topicId);
    return frans ? <FransOptions topic={frans} grade={grade} onChoice={onChoice} /> : null;
}
