import { HelpGuideView } from '@/components/HelpGuideView';
import { ADMIN_HELP_GUIDE } from '@/lib/help-content';

export default function AdminHelpPage() {
  return <HelpGuideView guide={ADMIN_HELP_GUIDE} />;
}
