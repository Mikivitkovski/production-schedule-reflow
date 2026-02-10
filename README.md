# Production Schedule Reflow (TypeScript)

A production schedule reflow engine that reschedules work orders after disruptions while respecting **hard manufacturing constraints**.
The goal is to always produce a **valid production schedule** when delays, shift boundaries, or maintenance events occur.
All dates and times are handled in **UTC**.

## Core Constraints Handled

- **Dependencies**  
  A work order can only start after **all parent work orders have finished**.
  
- **Work center conflicts**  
  Only one work order can run on a work center at any given time (no overlaps).

- **Shift boundaries**  
  Work automatically pauses outside defined shift hours and resumes in the next available shift.

- **Maintenance windows**  
  No work is scheduled during blocked maintenance periods.

- **Fixed maintenance work orders**  
  Maintenance work orders (`isMaintenance: true`) are considered fixed and are **never rescheduled**.

- **Shift & maintenance compliance**  
  All scheduling strictly occurs within active shift hours and outside maintenance windows.  
  This is enforced at the time-calculation level via `nextWorkingInstant()` and `addWorkingMinutes()`, which only advance time through valid working intervals.

## Design Notes

The engine enforces schedule validity **by construction**, not by post-validation.  
Time calculations are shift-aware and maintenance-aware, making it impossible for work to be scheduled outside valid production windows.

The constraint checker focuses on logical correctness (dependencies, overlaps, immovable maintenance), while temporal constraints are handled by the date/time utilities.

## Tech Stack

- **TypeScript (Node.js, ESM)**
- **Luxon** – UTC-based, shift-aware date/time arithmetic
- **Vitest** – automated test suite

## Demo
A Loom video demo is available showing:
- Running all scenarios
- Algorithm explanation
- Logs and validation

## Project Structure

