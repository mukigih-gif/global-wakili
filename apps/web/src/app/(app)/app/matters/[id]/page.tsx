export const dynamic = 'force-dynamic';

import { MatterDetailClient } from './MatterDetailClient';

export default function MatterDetailPage({ params }: { params: { id: string } }) {
  return <MatterDetailClient id={params.id} />;
}
