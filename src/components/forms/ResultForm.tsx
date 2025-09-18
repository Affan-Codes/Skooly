"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { resultSchema, type ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/actions/resultActions";
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


const ResultForm = ({
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
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema) as Resolver<ResultSchema>,
    defaultValues: {
      id: data?.id,
      score: data?.score?.toString() || "",
      studentId: data?.studentId || "",
      examId: data?.examId?.toString() || "",
      assignmentId: data?.assignmentId?.toString() || "",
    },
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    ResultSchema
  >(type === "create" ? createResult : updateResult, {
    success: false,
    error: false,
  });

  const selectedExamId = watch("examId");
  const selectedAssignmentId = watch("assignmentId");
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  // Filter students based on selected exam or assignment
  useEffect(() => {
    let classId: number | null = null;

    if (selectedExamId && relatedData?.exams) {
      const selectedExam = relatedData.exams.find(
        (exam: any) => exam.id.toString() === selectedExamId
      );
      if (selectedExam) {
        classId = selectedExam.lesson.classId;
      }
    } else if (selectedAssignmentId && relatedData?.assignments) {
      const selectedAssignment = relatedData.assignments.find(
        (assignment: any) => assignment.id.toString() === selectedAssignmentId
      );
      if (selectedAssignment) {
        classId = selectedAssignment.lesson.classId;
      }
    }
    if (classId && relatedData?.students) {
      const studentsInClass = relatedData.students.filter(
        (student: any) => student.classId === classId
      );
      setAvailableStudents(studentsInClass);
    } else {
      setAvailableStudents([]);
    }

    // Reset student selection when exam/assignment changes
    if (!data) {
      setValue("studentId", "");
    }
  }, [selectedExamId, selectedAssignmentId, relatedData, setValue, data]);

  // Clear assignment when exam is selected and vice versa
  useEffect(() => {
    if (selectedExamId && !data) {
      setValue("assignmentId", "");
    }
  }, [selectedExamId, setValue, data]);

  useEffect(() => {
    if (selectedAssignmentId && !data) {
      setValue("examId", "");
    }
  }, [selectedAssignmentId, setValue, data]);

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });


  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Result has been ${type === "create" ? "created" : "updated"}!`);
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

  const { students, exams, assignments } = relatedData || {};

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new result" : "Update the result" }
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

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Exam</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("examId") }
          >
            <option value="">Select an exam (optional)</option>
            { exams?.map((exam: { id: number; title: string; lesson: { name: string; subject: { name: string; }; }; }) => (
              <option value={ exam.id.toString() } key={ exam.id }>
                { exam.title } ({ exam.lesson.subject.name } - { exam.lesson.name })
              </option>
            )) }
          </select>
          { errors.examId?.message && (
            <p className="text-xs text-red-400">
              { errors.examId.message.toString() }
            </p>
          ) }
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Assignment</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("assignmentId") }
          >
            <option value="">Select an assignment (optional)</option>
            { assignments?.map((assignment: { id: number; title: string; lesson: { name: string; subject: { name: string; }; }; }) => (
              <option value={ assignment.id.toString() } key={ assignment.id }>
                { assignment.title } ({ assignment.lesson.subject.name } - { assignment.lesson.name })
              </option>
            )) }
          </select>
          { errors.assignmentId?.message && (
            <p className="text-xs text-red-400">
              { errors.assignmentId.message.toString() }
            </p>
          ) }
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Student</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("studentId") }
            disabled={ !selectedExamId && !selectedAssignmentId }
          >
            <option value="">
              { selectedExamId || selectedAssignmentId
                ? "Select a student"
                : "Select exam or assignment first" }
            </option>
            { availableStudents?.map((student: { id: string; name: string; surname: string; }) => (
              <option value={ student.id } key={ student.id }>
                { student.name } { student.surname }
              </option>
            )) }
          </select>
          { errors.studentId?.message && (
            <p className="text-xs text-red-400">
              { errors.studentId.message.toString() }
            </p>
          ) }
          { !selectedExamId && !selectedAssignmentId && (
            <p className="text-xs text-gray-400">Students filtered by exam/assignment class</p>
          ) }
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <InputField
            label="Score"
            name="score"
            register={ register }
            error={ errors?.score }
            type="number"
            inputProps={ {
              min: "0",
              max: "100",
              step: "1"
            } }
          />
          <p className="text-xs text-gray-400">Score out of 100</p>
        </div>
      </div>

      { (!selectedExamId && !selectedAssignmentId) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-700">
            Please select either an exam or an assignment (not both).
          </p>
        </div>
      ) }

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
          disabled={ !selectedExamId && !selectedAssignmentId }
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

export default ResultForm;

// PASS