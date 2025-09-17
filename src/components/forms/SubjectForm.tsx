"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { subjectSchema, type SubjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/actions/subjectActions";
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

const SubjectForm = ({
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

  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(
    data?.teachers?.map((t: any) => t.id) || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema) as Resolver<SubjectSchema>,
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    SubjectSchema
  >(type === "create" ? createSubject : updateSubject, {
    success: false,
    error: false,
  });

  useEffect(() => {
    setValue("teachers", selectedTeachers);
  }, [selectedTeachers, setValue]);

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Subject has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { teachers } = relatedData;

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new subject" : "Update the subject" }
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Subject name"
          name="name"
          defaultValue={ data?.name }
          register={ register }
          error={ errors?.name }
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
        <input
          type="hidden"
          { ...register("teachers") }
          value={ selectedTeachers }
        />
        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">Teachers</label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
            { teachers?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                { teachers.map((teacher: { id: string; name: string; surname: string; }) => (
                  <label
                    key={ teacher.id }
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={ selectedTeachers.includes(teacher.id) }
                      onChange={ () => handleTeacherToggle(teacher.id) }
                      className="rounded"
                    />
                    <span className="text-sm">
                      { teacher.name } { teacher.surname }
                    </span>
                  </label>
                )) }
              </div>
            ) : (
              <p className="text-gray-500 text-sm p-2">No teachers available</p>
            ) }
          </div>
          { errors.teachers?.message && (
            <p className="text-xs text-red-400">
              { errors.teachers.message.toString() }
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

export default SubjectForm;
