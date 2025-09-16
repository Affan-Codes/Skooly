"use client";

import Image from "next/image";
import {
  Dispatch,
  JSX,
  SetStateAction,
  useActionState,
  useEffect,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { FormContainerProps } from "./FormContainer";
import { Capitalize } from "@/lib/utils";
import { deleteSubject } from "@/actions/subjectActions";
import { deleteClass } from "@/actions/classActions";
import { deleteTeacher } from "@/actions/teacherActions";
import { deleteStudent } from "@/actions/studentActions";
import { deleteExam } from "@/actions/examActions";
import { deleteAssignment } from "@/actions/assignmentActions";
import { deleteEvent } from "@/actions/eventActions";
import { deleteAnnouncement } from "@/actions/announcementActions";

const deleteActionMap = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  parent: deleteSubject,
  lesson: deleteSubject,
  exam: deleteExam,
  assignment: deleteAssignment,
  result: deleteSubject,
  attendance: deleteSubject,
  event: deleteEvent,
  announcement: deleteAnnouncement,
};

//LAZY LOADING
const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      setOpen={ setOpen }
      type={ type }
      data={ data }
      relatedData={ relatedData }
    />
  ),
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any; }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
        ? "bg-lamaSky"
        : "bg-lamaPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    const [state, formAction] = useActionState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast(`${Capitalize(table)} has been deleted!`);
        router.refresh();
        setOpen(false);
      }
    }, [state]);

    return type === "delete" && id ? (
      <form action={ formAction } className="p-4 flex flex-col gap-4">
        <input type="text | number" name="id" value={ id } hidden readOnly />
        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this { table }?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-md border-none max-w self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      forms[table](setOpen, type, data, relatedData)
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      <button
        className={ `${size} flex items-center justify-center rounded-full ${bgColor}` }
        onClick={ () => setOpen(true) }
      >
        <Image src={ `/${type}.png` } alt="" width={ 16 } height={ 16 } />
      </button>
      { open && (
        <div className="w-screen min-h-screen absolute left-0 top-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={ () => setOpen(false) }
            >
              <Image src="/close.png" alt="" width={ 14 } height={ 14 } />
            </div>

            <Form />
          </div>
        </div>
      ) }
    </>
  );
};

export default FormModal;
