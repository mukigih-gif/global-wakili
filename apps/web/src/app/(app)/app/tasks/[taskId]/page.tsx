export const dynamic = 'force-dynamic';

import { TaskDetailClient } from './TaskDetailClient';

export default function TaskDetailPage({ params }: { params: { taskId: string } }) {
  return <TaskDetailClient taskId={params.taskId} />;
}
