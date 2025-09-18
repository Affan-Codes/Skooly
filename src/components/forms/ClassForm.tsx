"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, type ClassSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass } from "@/actions/classActions";
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

const ClassForm = ({
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
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema) as Resolver<ClassSchema>,
    defaultValues: {
      id: data?.id,
      name: data?.name || "",
      capacity: data?.capacity?.toString() || "",
      supervisorId: data?.supervisorId || "",
      gradeId: data?.gradeId?.toString() || "",
    },
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    ClassSchema
  >(type === "create" ? createClass : updateClass, {
    success: false,
    error: false,
  });

  const selectedGradeId = watch("gradeId");
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);

  // Filter available supervisors (exclude those already assigned to other classes)
  useEffect(() => {
    if (relatedData?.teachers && relatedData?.grades) {
      // Find teachers who are not supervisors of other classes (excluding current class in update mode)
      const availableTeachers = relatedData.teachers.filter((teacher: any) => {
        // In update mode, allow current supervisor to remain available
        if (type === "update" && data?.supervisorId === teacher.id) {
          return true;
        }
        // Check if teacher is not already a supervisor of another class
        return !relatedData.assignedSupervisors?.includes(teacher.id);
      });
      setAvailableSupervisors(availableTeachers);
    }
  }, [relatedData, type, data?.supervisorId]);

  // Set grade level when grade is selected
  useEffect(() => {
    if (selectedGradeId && relatedData?.grades) {
      const selectedGrade = relatedData.grades.find(
        (grade: any) => grade.id.toString() === selectedGradeId
      );
      if (selectedGrade) {
        setGradeLevel(selectedGrade.level);
      }
    }
  }, [selectedGradeId, relatedData?.grades]);

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Class has been ${type === "create" ? "created" : "updated"}!`);
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

  const { teachers, grades } = relatedData || {};

  // Generate class name suggestions based on grade level
  const getClassNameSuggestions = () => {
    if (!gradeLevel) return [];
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
    return sections.map(section => `${gradeLevel}${section}`);
  };

  const classNameSuggestions = getClassNameSuggestions();

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new class" : "Update the class" }
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        { data && (
          <InputField
            label="Id"
            name="id"
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Grade</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("gradeId") }
          >
            <option value="">Select Grade</option>
            { grades?.map((grade: { id: number; level: number; }) => (
              <option value={ grade.id.toString() } key={ grade.id }>
                Grade { grade.level }
              </option>
            )) }
          </select>
          { errors.gradeId?.message && (
            <p className="text-xs text-red-400">
              { errors.gradeId.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <InputField
            label="Class name"
            name="name"
            register={ register }
            error={ errors?.name }
          />
          { gradeLevel && classNameSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="text-xs text-gray-500">Suggestions:</span>
              { classNameSuggestions.map((suggestion) => (
                <button
                  key={ suggestion }
                  type="button"
                  onClick={ () => setValue("name", suggestion) }
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300"
                >
                  { suggestion }
                </button>
              )) }
            </div>
          ) }
          <p className="text-xs text-gray-400">
            Format: { gradeLevel || "X" }A, { gradeLevel || "X" }B, etc.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <InputField
            label="Capacity"
            name="capacity"
            register={ register }
            error={ errors?.capacity }
            type="number"
          />
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Supervisor</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("supervisorId") }
          >
            <option value="">Select Supervisor (Optional)</option>
            { availableSupervisors?.map(
              (teacher: { id: string; name: string; surname: string; }) => (
                <option value={ teacher.id } key={ teacher.id }>
                  { teacher.name } { teacher.surname }
                </option>
              )
            ) }
          </select>
          { errors.supervisorId?.message && (
            <p className="text-xs text-red-400">
              { errors.supervisorId.message.toString() }
            </p>
          ) }
          <p className="text-xs text-gray-400">
            Each teacher can supervise only one class
          </p>
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
    </form >
  );
};

export default ClassForm;

// PASS