import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { PageProps } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { Class, Day, Lesson, Prisma, Subject, Teacher } from "@/generated/prisma";
import Image from "next/image";

type LessonList = Lesson & { subject: Subject; } & { class: Class; } & {
  teacher: Teacher;
};

const LessonListPage = async ({
  searchParams,
}: PageProps) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to format day
  const formatDay = (day: Day) => {
    return day.charAt(0) + day.slice(1).toLowerCase();
  };

  const columns = [
    {
      header: "Lesson Name",
      accessor: "name",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Schedule",
      accessor: "schedule",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin"
      ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
      : []),
  ];

  const renderRow = (item: LessonList) => (
    <tr
      key={ item.id }
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        { item.name }
      </td>
      <td className="font-medium">{ item.subject.name }</td>
      <td className="hidden md:table-cell">{ item.class.name }</td>
      <td className="hidden md:table-cell">
        { item.teacher.name + " " + item.teacher.surname }
      </td>
      <td className="hidden lg:table-cell">
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            { formatDay(item.day) }
          </span>
          <span className="text-xs text-gray-500">
            { formatTime(item.startTime) } - { formatTime(item.endTime) }
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          { role === "admin" && (
            <>
              <FormContainer table="lesson" type="update" data={ item } />
              <FormContainer table="lesson" type="delete" id={ item.id } />
            </>
          ) }
        </div>
      </td>
    </tr>
  );

  const params = await searchParams;
  const { page, ...queryParams } = params;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITIONS
  const query: Prisma.LessonWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.classId = parseInt(value);
            break;
          case "teacherId":
            query.teacherId = value;
            break;
          case "subjectId":
            query.subjectId = parseInt(value);
            break;
          case "day":
            query.day = value as Day;
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { subject: { name: { contains: value, mode: "insensitive" } } },
              { class: { name: { contains: value, mode: "insensitive" } } },
              {
                teacher: {
                  OR: [
                    { name: { contains: value, mode: "insensitive" } },
                    { surname: { contains: value, mode: "insensitive" } }
                  ]
                }
              }
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.teacherId = userId!;
      break;
    case "student":
      query.class = {
        students: {
          some: { id: userId! },
        },
      };
      break;
    case "parent":
      query.class = {
        students: {
          some: { parentId: userId! },
        },
      };
      break;
    default:
      break;
  }


  const [data, count] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      orderBy: [
        { day: 'asc' },
        { startTime: 'asc' }
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.lesson.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */ }
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Lessons  </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={ 14 } height={ 14 } />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={ 14 } height={ 14 } />
            </button>
            { role === "admin" && <FormContainer table="lesson" type="create" /> }
          </div>
        </div>
      </div>
      {/* LIST */ }
      <Table columns={ columns } renderRow={ renderRow } data={ data } />
      {/* PAGINATION */ }
      <Pagination page={ p } count={ count } />
    </div>
  );
};

export default LessonListPage;

// PASS