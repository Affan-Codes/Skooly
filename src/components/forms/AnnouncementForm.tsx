"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { announcementSchema, type AnnouncementSchema } from "@/lib/formValidationSchemas";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { formatDateTimeForInput } from "@/lib/utils";

const AnnouncementForm = ({
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
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema) as Resolver<AnnouncementSchema>,
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; },
    AnnouncementSchema
  >(type === "create" ? createAnnouncement : updateAnnouncement, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Announcement has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { classes } = relatedData || {};

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new announcement" : "Update the announcement" }
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={ data?.title }
          register={ register }
          error={ errors?.title }
        />
        <InputField
          label="Date"
          name="date"
          defaultValue={ formatDateTimeForInput(data?.date) }
          register={ register }
          error={ errors?.date }
          type="datetime-local"
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

        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">Description</label>
          <textarea
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full h-24 resize-none"
            placeholder="Enter announcement description..."
            { ...register("description") }
            defaultValue={ data?.description }
          />
          { errors.description?.message && (
            <p className="text-xs text-red-400">
              { errors.description.message.toString() }
            </p>
          ) }
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Class (Optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("classId") }
            defaultValue={ data?.classId || "" }
          >
            <option value="">All Classes (School-wide)</option>
            { classes?.map(
              (classItem: { id: number; name: string; grade: { level: number; }; }) => (
                <option value={ classItem.id } key={ classItem.id }>
                  Grade { classItem.grade.level } - { classItem.name }
                </option>
              )
            ) }
          </select>
          { errors.classId?.message && (
            <p className="text-xs text-red-400">
              { errors.classId.message.toString() }
            </p>
          ) }
          <p className="text-xs text-gray-400">
            Leave empty to send to all classes
          </p>
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

export default AnnouncementForm;