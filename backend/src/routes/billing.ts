// Add this to your Express router
router.post('/time-entry', async (req, res) => {
  const { description, duration, appliedRate, totalValue, entryType, matterId, advocateId } = req.body;
  
  try {
    const newEntry = await prisma.timeEntry.create({
      data: {
        description,
        duration,
        appliedRate,
        totalValue,
        entryType,
        matterId: parseInt(matterId),
        advocateId: parseInt(advocateId)
      }
    });
    res.json(newEntry);
  } catch (error) {
    res.status(500).json({ error: "Could not save time entry" });
  }
});