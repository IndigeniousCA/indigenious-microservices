exports.up = function(knex) {
  return Promise.all([
    // Main Contracts Table
    knex.schema.createTable('contracts', function(table) {
      table.uuid('id').primary();
      table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
      table.uuid('winning_bid_id').references('id').inTable('bids').onDelete('CASCADE');
      table.string('business_id').notNullable(); // Winning business
      table.string('awarded_by').notNullable(); // User who awarded the contract
      table.decimal('contract_value', 15, 2).notNullable();
      table.decimal('total_paid', 15, 2).defaultTo(0);
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.date('actual_start_date');
      table.date('actual_end_date');
      table.integer('completion_percentage').defaultTo(0);
      table.text('terms_conditions');
      table.text('special_clauses');
      table.boolean('performance_bond_required').defaultTo(false);
      table.text('insurance_requirements');
      table.string('status').defaultTo('draft'); // draft, pending_signature, active, completed, terminated, cancelled
      table.text('notes');
      table.timestamps(true, true);

      // Indexes
      table.index(['rfq_id']);
      table.index(['business_id']);
      table.index(['status']);
      table.index(['awarded_by']);
      table.index(['start_date']);
      table.index(['end_date']);

      // Ensure only one contract per RFQ
      table.unique(['rfq_id']);
    }),

    // Contract Payment Schedule
    knex.schema.createTable('contract_payments', function(table) {
      table.uuid('id').primary();
      table.uuid('contract_id').references('id').inTable('contracts').onDelete('CASCADE');
      table.string('milestone').notNullable();
      table.decimal('percentage', 5, 2).notNullable(); // Percentage of total contract value
      table.decimal('amount', 15, 2); // Actual amount (calculated or adjusted)
      table.date('due_date').notNullable();
      table.string('status').defaultTo('pending'); // pending, paid, overdue
      table.timestamp('paid_at');
      table.string('processed_by'); // User who processed the payment
      table.text('payment_notes');
      table.timestamps(true, true);

      table.index(['contract_id']);
      table.index(['status']);
      table.index(['due_date']);
    }),

    // Contract Payment Records (for accounting)
    knex.schema.createTable('contract_payment_records', function(table) {
      table.uuid('id').primary();
      table.uuid('contract_id').references('id').inTable('contracts').onDelete('CASCADE');
      table.uuid('payment_id').references('id').inTable('contract_payments').onDelete('CASCADE');
      table.decimal('amount', 15, 2).notNullable();
      table.date('payment_date').notNullable();
      table.string('payment_method'); // electronic_transfer, cheque, etc.
      table.string('reference_number');
      table.string('processed_by').notNullable();
      table.text('notes');
      table.timestamps(true, true);

      table.index(['contract_id']);
      table.index(['payment_date']);
      table.index(['reference_number']);
    }),

    // Contract Status History
    knex.schema.createTable('contract_status_history', function(table) {
      table.uuid('id').primary();
      table.uuid('contract_id').references('id').inTable('contracts').onDelete('CASCADE');
      table.string('previous_status');
      table.string('new_status').notNullable();
      table.string('changed_by').notNullable();
      table.text('change_reason');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['contract_id']);
      table.index(['created_at']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('contract_status_history'),
    knex.schema.dropTable('contract_payment_records'),
    knex.schema.dropTable('contract_payments'),
    knex.schema.dropTable('contracts')
  ]);
};