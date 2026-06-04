# User Story: 17 - Subscribe to a Paid Plan and Manage Billing

**As a** content creator,
**I want** to subscribe to a paid plan and manage my billing details,
**so that** I can unlock full access to the app's features and control my subscription without contacting support.

## Acceptance Criteria

*   A pricing/plans page is accessible from the app showing available plan tiers with feature and usage-limit comparisons.
*   The user can select a plan and complete payment via a secure checkout flow (e.g., Stripe Checkout).
*   After successful payment, the user's account is immediately upgraded to the selected plan.
*   A billing management page lets the user: view their current plan and renewal date, update their payment method, and cancel their subscription.
*   On cancellation, the user retains access until the end of the current billing period, after which their account reverts to the free tier.
*   Subscription events (new subscription, cancellation, payment failure) are handled via webhook and reflected in the app without manual intervention.
*   Payment failure triggers an in-app notification prompting the user to update their payment method.

## Notes

*   Stripe is the recommended payment provider — Stripe Checkout handles PCI compliance, and Stripe Customer Portal handles self-service billing management with minimal custom code.
*   Plan limits (jobs per month, formats available, etc.) are enforced based on the active subscription tier stored on the user record.
*   At $30/month per user and ~$0.15–0.40 in API costs per job, the break-even is roughly 75 jobs/month per seat (per the transcript).
