import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Announcement, Class, Prisma } from "@prisma/client";
import Image from "next/image";

type AnnouncementList = Announcement & { class: Class | null; };

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined; };
}) => {

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string; })?.role;

  const columns = [
    {
      header: "Title & Description",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
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

  const renderRow = (item: AnnouncementList) => (
    <tr
      key={ item.id }
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium">
            { item.title }
          </span>
          <span className="text-xs text-gray-500 whitespace-pre-wrap">
            { item.description }
          </span>
        </div>
      </td>
      <td>{ item.class?.name || "All Classes" }</td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col">
          <span className="text-sm">
            { new Intl.DateTimeFormat("en-In", {
              year: "numeric",
              month: "short",
              day: "numeric"
            }).format(item.date) }
          </span>
          <span className="text-xs text-gray-500">
            { new Intl.DateTimeFormat("en-In", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            }).format(item.date) }
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          { role === "admin" && (
            <>
              <FormContainer table="announcement" type="update" data={ item } />
              <FormContainer table="announcement" type="delete" id={ item.id } />
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
  const query: Prisma.AnnouncementWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [{
              title: {
                contains: value,
                mode: "insensitive",
              }
            }, {
              description: {
                contains: value,
                mode: "insensitive",
              }
            }];
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  // Only apply role filtering if user is authenticated and not admin
  if (userId && role && role !== "admin") {
    query.OR = [
      { classId: null }, // School-wide announcements
      { class: roleConditions[role as keyof typeof roleConditions] || {} },
    ];
  }

  const [data, count] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.announcement.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */ }
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
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
            { role === "admin" && (
              <FormContainer table="announcement" type="create" />
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

export default AnnouncementListPage;
