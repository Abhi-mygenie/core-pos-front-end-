# CR-109 — Dynamic Prep Time Calculation for Aggregator

**ID:** CR-109
**Type:** CR (Feature)
**Created:** 2026-07-26
**Priority:** P2 — MEDIUM (static pills work; dynamic computation adds accuracy)
**Risk:** LOW (additive computation, no existing flow change)
**Module:** Dashboard — AggregatorOrderPopOut
**Duplicate Check:** DISTINCT. Related: CR-107 (auto-accept uses this too).
**Source:** INVESTIGATION (Report #2, §I-7)
**Confidence:** CONFIRMED — backend settings exist, FE shows static pills only
**Code Reality:** NONE

## Description

AggregatorOrderPopOut shows static prep time pills (5/10/15/20/25/30) with no intelligence. Backend provides: `default_prep_time: 15`, `prep_time_count_method: quantity`, `prep_time_bonus_config: [brackets]`. The popup should pre-select the computed optimal pill based on order item quantities + bonus brackets.

## Blast Radius

SMALL — 1-2 files (`AggregatorOrderPopOut.jsx`, new util), ~20 lines.
