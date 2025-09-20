import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { PageProps } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { Parent, Prisma } from "@/generated/prisma";
import Image from "next/image";
import Link from "next/link";

type ParentList = Parent & { students: { id: string; name: string; surname: string; }[]; };

const ParentListPage = async ({
  searchParams,
}: PageProps) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Students",
      accessor: "students",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
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

  const renderRow = (item: ParentList) => (
    <tr
      key={ item.id }
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <h3 className="font-semibold">{ item.name } { item.surname }</h3>
          <p className="text-xs text-gray-500">{ item?.email || "No email" }</p>
        </div>
      </td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col gap-1">
          { item.students.length > 0 ? (
            item.students.map((student) => (
              <Link
                key={ student.id }
                href={ `/list/students/${student.id}` }
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                { student.name } { student.surname }
              </Link>
            ))
          ) : (
            <span className="text-gray-500 text-xs">No students</span>
          ) }
        </div>
      </td>
      <td className="hidden md:table-cell">{ item.phone }</td>
      <td className="hidden md:table-cell">{ item.address }</td>
      <td>
        <div className="flex items-center gap-2">
          { role === "admin" && (
            <>
              <FormContainer table="parent" type="update" data={ item } />
              <FormContainer table="parent" type="delete" id={ item.id } />
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
  const query: Prisma.ParentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { surname: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.parent.findMany({
      where: query,
      include: {
        students: {
          select: { id: true, name: true, surname: true },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.parent.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */ }
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={ 14 } height={ 14 } />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={ 14 } height={ 14 } />
            </button>
            { role === "admin" && <FormContainer table="parent" type="create" /> }
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

export default ParentListPage;
