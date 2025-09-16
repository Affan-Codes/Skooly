"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { assignmentSchema, type AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/actions/assignmentActions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { formatDateTimeForInput } from "@/lib/utils";

const AssignmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {

  const [selectedSubject, setSelectedSubject] = useState<string>(data?.lesson?.subject?.id?.toString() || "");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema) as Resolver<AssignmentSchema>,
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; },
    AssignmentSchema
  >(type === "create" ? createAssignment : updateAssignment, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((data) => {
    const payload = {
      ...data, startDate: data.startDate || new Date(),
      lessonId: Number(data.lessonId)
    };

    startTransition(() => {
      formAction(payload);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { subjects, lessons } = relatedData || {};

  const filteredLessons = lessons?.filter((lesson: any) => selectedSubject && lesson.subjectId && lesson.subjectId.toString() === selectedSubject) || [];

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setValue("lessonId", undefined as any);
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new assignment" : "Update the assignment" }
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Assignment Title"
          name="title"
          defaultValue={ data?.title }
          register={ register }
          error={ errors?.title }
        />
        <InputField
          label="Due Date"
          name="dueDate"
          type="datetime-local"
          defaultValue={ formatDateTimeForInput(data?.dueDate) }
          register={ register }
          error={ errors?.dueDate }
        />
        { data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={ data?.id }
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Subject</label>
          <select className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" value={ selectedSubject } onChange={ (e) => handleSubjectChange(e.target.value) }>
            <option value="">Select Subject</option>
            { subjects?.map((subject: { id: number, name: string; }) => (
              <option value={ subject.id } key={ subject.id }>{ subject.name }</option>
            )) }
          </select>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className={ `ring-[1.5px] p-2 rounded-md text-sm w-full ${!selectedSubject ? "ring-gray-200 bg-gray-100 cursor-not-allowed" : "ring-gray-300"}` }
            { ...register("lessonId") }
            defaultValue={ data?.lessonId || "" }
            disabled={ !selectedSubject }
          >
            <option value=""> { !selectedSubject ? "Select Subject First" : "Select Lesson" }</option>
            { filteredLessons?.map((lesson: { id: number; name: string; }) => (
              <option value={ lesson.id } key={ lesson.id }>
                { lesson.name }
              </option>
            )) }
          </select>
          { errors.lessonId?.message && (
            <p className="text-xs text-red-400">
              { errors.lessonId.message.toString() }
            </p>
          ) }
        </div>
      </div>
      { state.error && (
        <span className="text-red-500">Something went wrong!</span>
      ) }
      <button type="submit" className="bg-blue-400 text-white p-2 rounded-md">
        { type === "create" ? "Create" : "Update" }
      </button>
    </form>
  );
};

export default AssignmentForm;

// PASS