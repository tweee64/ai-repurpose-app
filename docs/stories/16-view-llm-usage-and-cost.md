# User Story: 16 - View LLM API Usage and Cost Per Job

**As a** content creator,
**I want** to see the API token usage and estimated cost for each repurpose job,
**so that** I can understand how much I am consuming and the app can surface usage against my plan limits.

## Acceptance Criteria

*   Each repurpose job records the total input tokens, output tokens, and estimated cost (in USD) from every LLM call made during that job.
*   Token counts and cost are visible on the job detail view (e.g., "~$0.22 · 14,200 tokens").
*   A usage summary is available in the user's account area showing total tokens and estimated cost for the current billing period.
*   If a user's plan has a monthly job or token limit, the usage summary shows current usage versus the limit with a visual indicator.
*   When a user approaches their limit (e.g., 90% consumed), a warning banner is shown.
*   When the limit is reached, further repurpose attempts are blocked with a clear "Upgrade your plan" message.

## Notes

*   Token counts and cost should be logged via Langfuse (as discussed in the transcript) so they can also be reviewed in the Langfuse dashboard for prompt optimisation.
*   Cost estimates should use published Groq/Claude API pricing at time of the call — store the raw token counts so estimates can be recalculated if pricing changes.
*   This story is a prerequisite for enforcing subscription-tier usage limits (Story 17).
