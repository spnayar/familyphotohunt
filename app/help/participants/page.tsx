import { HelpGuideView } from '@/components/HelpGuideView';
import { PARTICIPANT_HELP_GUIDE } from '@/lib/help-content';

export default function ParticipantHelpPage() {
  return <HelpGuideView guide={PARTICIPANT_HELP_GUIDE} />;
}
