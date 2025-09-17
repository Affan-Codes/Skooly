import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";

type SubjectList = Subject & { teachers: Teacher[]; _count: { teachers: number, lessons: number; }; };

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined; };
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;

  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Teachers",
      accessor: "teachers",
      className: "hidden md:table-cell",
    },
    {
      header: "Lessons Count",
      accessor: "lessonsCount",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
    },
  ];

  const renderRow = (item: SubjectList) => (
    <tr
      key={ item.id }
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{ item.name }</td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col gap-1">
          { item.teachers.length > 0 ? (
            <>
              <span className="text-sm">
                { item.teachers.slice(0, 2).map((teacher, index) => (
                  <span key={ teacher.id }>
                    { teacher.name } { teacher.surname }
                    { index < Math.min(item.teachers.length, 2) - 1 ? ", " : "" }
                  </span>
                )) }
              </span>
              { item.teachers.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{ item.teachers.length - 2 } more
                </span>
              ) }
              <span className="text-xs text-gray-500">
                { item._count.teachers } teacher{ item._count.teachers !== 1 ? 's' : '' }
              </span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">No teachers assigned</span>
          ) }
        </div>
      </td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-blue-600">
            { item._count.lessons }
          </span>
          <span className="text-xs text-gray-500">
            lesson{ item._count.lessons !== 1 ? 's' : '' }
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          { role === "admin" && (
            <>
              <FormContainer table="subject" type="update" data={ item } />
              <FormContainer table="subject" type="delete" id={ item.id } />
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
  const query: Prisma.SubjectWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              {
                teachers: {
                  some: {
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

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: {
          select: {
            id: true, name: true, surname: true
          }
        },
        _count: {
          select: {
            teachers: true,
            lessons: true
          }
        }
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.subject.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */ }
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={ 14 } height={ 14 } />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={ 14 } height={ 14 } />
            </button>
            { role === "admin" && (
              <FormContainer table="subject" type="create" />
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

export default SubjectListPage;
