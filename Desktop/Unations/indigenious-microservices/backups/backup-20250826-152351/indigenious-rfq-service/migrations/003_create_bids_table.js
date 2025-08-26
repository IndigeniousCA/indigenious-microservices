exports.up = function(knex) {
  return knex.schema.createTable('bids', function(table) {
    table.uuid('id').primary();
    table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
    table.string('business_id').notNullable(); // Business ID that submitted the bid
    table.string('submitted_by').notNullable(); // User ID who submitted the bid
    table.decimal('amount', 15, 2).notNullable();
    table.integer('timeline_days').notNullable();
    table.text('proposal').notNullable();
    table.text('methodology');
    table.text('team_info');
    table.string('status').defaultTo('submitted'); // submitted, under_review, awarded, not_selected, withdrawn
    table.decimal('score', 5, 2); // Evaluation score (0-100)
    table.text('feedback'); // Feedback from evaluator
    table.text('evaluation_notes'); // Internal evaluation notes
    table.string('evaluated_by'); // User ID who evaluated
    table.timestamp('evaluated_at');
    table.timestamp('awarded_at');
    table.string('withdrawal_reason');
    table.timestamp('withdrawn_at');
    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    // Indexes
    table.index(['rfq_id']);
    table.index(['business_id']);
    table.index(['status']);
    table.index(['submitted_at']);
    table.index(['score']);

    // Unique constraint to prevent multiple bids from same business
    table.unique(['rfq_id', 'business_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bids');
};