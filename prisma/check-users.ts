import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: {
      student: {
        include: {
          applications: {
            include: {
              assessmentAttempts: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${users.length} users in database:`);
  for (const u of users) {
    console.log(`- User: ${u.id} | Email: ${u.email} | Role: ${u.role}`);
    if (u.student) {
      console.log(`  Student: ${u.student.id} | Name: ${u.student.fullName}`);
      for (const a of u.student.applications) {
        console.log(`    Application: ${a.id} | Status: ${a.currentStatus} | DriveId: ${a.recruitmentDriveId}`);
        for (const att of a.assessmentAttempts) {
          console.log(`      Attempt: ${att.id} | Status: ${att.status} | ExpiresAt: ${att.expiresAt}`);
        }
      }
    }
  }

  const drives = await prisma.recruitmentDrive.findMany();
  console.log(`Found ${drives.length} recruitment drives:`);
  for (const d of drives) {
    console.log(`- Drive: ${d.id} | Name: ${d.name} | Status: ${d.status}`);
  }

  const assessments = await prisma.assessment.findMany({
    include: { questions: true },
  });
  console.log(`Found ${assessments.length} assessments:`);
  for (const ass of assessments) {
    console.log(`- Assessment: ${ass.id} | Title: ${ass.title} | Type: ${ass.type} | Duration: ${ass.durationMinutes} | Pass%: ${ass.passPercentage} | Questions: ${ass.questions.length}`);
  }
}

check().finally(() => prisma.$disconnect());
