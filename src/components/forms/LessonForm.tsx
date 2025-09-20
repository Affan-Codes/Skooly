"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { lessonSchema, type LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/actions/lessonActions";
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
import { DayEnum, formatDateTimeForInput } from "@/lib/utils";

const LessonForm = ({
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema) as Resolver<LessonSchema>,
    defaultValues: {
      name: data?.name || "",
      day: data?.day || DayEnum.MONDAY,
      startTime: formatDateTimeForInput(data?.startTime),
      endTime: formatDateTimeForInput(data?.endTime),
      subjectId: data?.subjectId?.toString() || "",
      classId: data?.classId?.toString() || "",
      teacherId: data?.teacherId || "",
    },
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    LessonSchema
  >(type === "create" ? createLesson : updateLesson, {
    success: false,
    error: false,
  });

  const selectedSubjectId = watch("subjectId");
  const startTime = watch("startTime");
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);

  // Filter teachers based on selected subject
  useEffect(() => {
    if (selectedSubjectId && relatedData?.subjects) {
      const selectedSubject = relatedData.subjects.find(
        (subject: any) => subject.id.toString() === selectedSubjectId
      );
      if (selectedSubject) {
        setAvailableTeachers(selectedSubject.teachers || []);
      } else {
        setAvailableTeachers([]);
      }
      // Reset teacher selection when subject changes
      if (!data) {
        setValue("teacherId", "");
      }
    }
  }, [selectedSubjectId, relatedData?.subjects, setValue, data]);

  useEffect(() => {
    if (startTime) {
      const start = new Date(startTime);

      // Auto-set day based on start time
      const dayOfWeek = start.getDay();
      const dayMapping = [DayEnum.MONDAY, DayEnum.MONDAY, DayEnum.TUESDAY, DayEnum.WEDNESDAY, DayEnum.THURSDAY, DayEnum.FRIDAY, DayEnum.MONDAY]; // Sunday maps to Monday
      setValue("day", dayMapping[dayOfWeek]);

      // Auto-set end time (1 hour later) only for create mode
      if (!data) {
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        setValue("endTime", formatDateTimeForInput(end));
      }
    }
  }, [startTime, setValue, data]);

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Lesson has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      if (state.message) {
        toast.error(state.message);
      } else {
        toast.error("Something went wrong!");
      }
    }
  }, [state, router, type, setOpen]);

  const { subjects, classes } = relatedData || {};

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new lesson" : "Update the lesson" }
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Lesson name"
          name="name"
          register={ register }
          error={ errors?.name }
        />

        { data && (
          <InputField
            label="Id"
            name="id"
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }
        <input
          type="hidden"
          { ...register("day") }
        />

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Start Date & Time</label>
          <input
            type="datetime-local"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("startTime") }
            step="900" // 15 minutes intervals
          />
          { errors.startTime?.message && (
            <p className="text-xs text-red-400">
              { errors.startTime.message.toString() }
            </p>
          ) }
          <p className="text-xs text-gray-400">Select date and start time for the lesson</p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">End Date & Time</label>
          <input
            type="datetime-local"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("endTime") }
            step="900" // 15 minutes intervals
          />
          { errors.endTime?.message && (
            <p className="text-xs text-red-400">
              { errors.endTime.message.toString() }
            </p>
          ) }
          <p className="text-xs text-gray-400">End time (auto-filled with 1 hour duration)</p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Subject</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("subjectId") }
          >
            <option value="">Select a subject</option>
            { subjects?.map((subject: { id: number; name: string; teachers: any[]; }) => (
              <option value={ subject.id.toString() } key={ subject.id }>
                { subject.name }
              </option>
            )) }
          </select>
          { errors.subjectId?.message && (
            <p className="text-xs text-red-400">
              { errors.subjectId.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Teacher</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("teacherId") }
            disabled={ !selectedSubjectId }
          >
            <option value="">
              { selectedSubjectId ? "Select a teacher" : "Select subject first" }
            </option>
            { availableTeachers?.map((teacher: { id: string; name: string; surname: string; }) => (
              <option value={ teacher.id } key={ teacher.id }>
                { teacher.name } { teacher.surname }
              </option>
            )) }
          </select>
          { errors.teacherId?.message && (
            <p className="text-xs text-red-400">
              { errors.teacherId.message.toString() }
            </p>
          ) }
          { !selectedSubjectId && (
            <p className="text-xs text-gray-400">Teachers filtered by subject</p>
          ) }
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Class</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("classId") }
          >
            <option value="">Select a class</option>
            { classes?.map((class_: { id: number; name: string; grade: { level: number; }; }) => (
              <option value={ class_.id.toString() } key={ class_.id }>
                { class_.name } (Grade { class_.grade.level })
              </option>
            )) }
          </select>
          { errors.classId?.message && (
            <p className="text-xs text-red-400">
              { errors.classId.message.toString() }
            </p>
          ) }
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
        >
          { type === "create" ? "Create" : "Update" }
        </button>

        { type === "create" && (
          <button
            type="button"
            onClick={ () => reset() }
            className="bg-gray-400 text-white p-2 rounded-md hover:bg-gray-500 transition-colors"
          >
            Reset
          </button>
        ) }
      </div>
    </form>
  );
};

export default LessonForm;

// PASS