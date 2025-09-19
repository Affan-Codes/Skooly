import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const ParentPage = async () => {

  const { userId } = await auth();

  const parent = await prisma.parent.findUnique({
    where: { id: userId! },
    include: {
      students: {
        include: {
          class: true
        }
      }
    }
  });

  const studentClass = parent?.students[0]?.class;

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */ }
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold"> Schedule ({ parent?.students[0]?.name })</h1>
          { studentClass && (
            <BigCalendarContainer type="classId" id={ studentClass.id } />
          ) }
        </div>
      </div>
      {/* RIGHT */ }
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;
