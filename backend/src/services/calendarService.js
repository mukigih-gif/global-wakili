/**
 * ADD COURT HEARING
 * Links a court date to a specific Matter
 */
async function addHearing(matterReference, date, type, court, notes) {
  // 1. Find the matter by its reference (e.g., GW-2026-001)
  const matter = await prisma.matter.findUnique({
    where: { reference: matterReference }
  });

  if (!matter) {
    console.log("❌ Error: Matter not found!");
    return;
  }

  // 2. Create the hearing entry
  const hearing = await prisma.hearing.create({
    data: {
      date: new Date(date), // format: '2026-04-15T09:00:00'
      type: type,           // Mention, Hearing, Ruling
      court: court,         // e.g., Milimani Court 5
      notes: notes,
      matterId: matter.id
    }
  });

  console.log(`✅ Hearing Added for ${matterReference}: ${type} on ${hearing.date.toDateString()}`);
}

// Example Usage:
// addHearing('GW-2026-001', '2026-06-20T09:30:00', 'Hearing', 'Milimani Court 3', 'Defense to present witness');