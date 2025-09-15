import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Assignment, Class, Grade, Lesson, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";

type AssignmentList = Assignment & {
  lesson: Lesson & {
    subject: Subject;
    class: Class & { grade: Grade; };
    teacher: Teacher;
  };
};

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined; };
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Subject",
      accessor: "name",
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
      header: "Due Date",
      accessor: "dueDate",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
      : []),
  ];

  const renderRow = (item: AssignmentList) => (
    <tr
      key={ item.id }
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{ item.title }</td>
      <td className="font-medium">{ item.lesson.subject.name }</td>
      <td className="hidden md:table-cell">Grade { item.lesson.class.grade.level } - { item.lesson.class.name }</td>
      <td className="hidden md:table-cell">
        { item.lesson.teacher.name + " " + item.lesson.teacher.surname }
      </td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col">
          <span className={ `text-sm font-medium ${new Date(item.dueDate) < new Date()
            ? "text-red-600"
            : new Date(item.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
              ? "text-orange-600"
              : "text-green-600"
            }` }>
            { new Intl.DateTimeFormat("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }).format(item.dueDate) }
          </span>
          <span className="text-xs text-gray-500">
            { new Intl.DateTimeFormat("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(item.dueDate) }
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          { (role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="assignment" type="update" data={ item } />
              <FormContainer table="assignment" type="delete" id={ item.id } />
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
  const query: Prisma.AssignmentWhereInput = {};
  query.lesson = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lesson.classId = parseInt(value);
            break;
          case "teacherId":
            query.lesson.teacherId = value;
            break;
          case "subjectId":
            query.lesson.subjectId = parseInt(value);
            break;
          case "search":
            query.OR = [
              { title: { contains: value, mode: "insensitive" } },
              { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } },
              {
                lesson: {
                  teacher: {
                    OR: [
                      { name: { contains: value, mode: "insensitive" } },
                      { surname: { contains: value, mode: "insensitive" } }
                    ]
                  }
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
      const teacherCondition = { lesson: { teacherId: userId! } };
      if (query.OR) {
        query.AND = [
          { OR: query.OR },
          teacherCondition
        ];
        delete query.OR;
      } else {
        Object.assign(query, teacherCondition);
      }
      break;
    case "student":
      const studentCondition = {
        lesson: {
          class: {
            students: { some: { id: userId! } }
          }
        }
      };
      if (query.OR) {
        query.AND = [
          { OR: query.OR },
          studentCondition
        ];
        delete query.OR;
      } else {
        Object.assign(query, studentCondition);
      }
      break;
    case "parent":
      const parentCondition = {
        lesson: {
          class: {
            students: { some: { parentId: userId! } }
          }
        }
      };
      if (query.OR) {
        query.AND = [
          { OR: query.OR },
          parentCondition
        ];
        delete query.OR;
      } else {
        Object.assign(query, parentCondition);
      }
      break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: {
              select: { name: true },
            },
            teacher: {
              select: { name: true, surname: true },
            },
            class: {
              select: { name: true, grade: { select: { level: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.assignment.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */ }
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Assignments
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={ 14 } height={ 14 } />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={ 14 } height={ 14 } />
            </button>
            { (role === "admin" || role === "teacher") && (
              <FormContainer table="assignment" type="create" />
            ) }
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

export default AssignmentListPage;
