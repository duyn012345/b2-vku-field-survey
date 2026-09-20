/**
 * Bộ câu hỏi (data-driven). Muốn thêm/sửa câu hỏi chỉ cần chỉnh file này.
 *
 * type:  'single' (chọn 1) | 'multi' (chọn nhiều) | 'scale' (1-5) | 'text' (tự luận)
 * short: tiêu đề cột trên Google Sheets (giữ ổn định để không sinh cột mới)
 */
export const QUESTION_SETS = [
  {
    id: 'job-needs-v1',
    title: 'Nhu cầu việc làm sau tốt nghiệp',
    questions: [
      {
        id: 'q_status',
        short: 'Hiện trạng việc làm',
        label: 'Hiện tại bạn đang ở tình trạng nào?',
        type: 'single',
        required: true,
        options: [
          'Chưa đi làm, đang tìm việc',
          'Đang đi làm bán thời gian',
          'Đang đi làm toàn thời gian',
          'Chưa có nhu cầu / định học tiếp',
        ],
      },
      {
        id: 'q_field',
        short: 'Lĩnh vực mong muốn',
        label: 'Bạn muốn làm việc trong lĩnh vực nào?',
        type: 'multi',
        required: true,
        options: [
          'Phát triển phần mềm',
          'Trí tuệ nhân tạo / Dữ liệu',
          'An toàn thông tin',
          'Mạng & hạ tầng',
          'Thiết kế UI/UX',
          'Kiểm thử (QA/QC)',
          'Quản lý dự án / BA',
          'Khác',
        ],
      },
      {
        id: 'q_jobtype',
        short: 'Hình thức làm việc',
        label: 'Hình thức làm việc bạn mong muốn?',
        type: 'single',
        options: ['Toàn thời gian', 'Bán thời gian', 'Thực tập', 'Freelance / Remote'],
      },
      {
        id: 'q_salary',
        short: 'Mức lương mong muốn',
        label: 'Mức lương khởi điểm mong muốn (triệu đồng/tháng)?',
        type: 'single',
        options: ['Dưới 7', '7 – 10', '10 – 15', '15 – 20', 'Trên 20'],
      },
      {
        id: 'q_location',
        short: 'Nơi làm việc mong muốn',
        label: 'Bạn muốn làm việc ở đâu?',
        type: 'single',
        options: ['Đà Nẵng', 'Hà Nội', 'TP. Hồ Chí Minh', 'Nước ngoài / Remote', 'Khác'],
      },
      {
        id: 'q_channel',
        short: 'Kênh tìm việc',
        label: 'Bạn thường tìm việc qua kênh nào?',
        type: 'multi',
        options: [
          'Website tuyển dụng',
          'Mạng xã hội',
          'Bạn bè / thầy cô giới thiệu',
          'Ngày hội việc làm',
          'Website / fanpage của trường',
        ],
      },
      {
        id: 'q_difficulty',
        short: 'Khó khăn khi tìm việc',
        label: 'Khó khăn lớn nhất khi tìm việc của bạn?',
        type: 'multi',
        options: [
          'Thiếu kinh nghiệm thực tế',
          'Thiếu kỹ năng mềm',
          'Ngoại ngữ',
          'Thiếu thông tin tuyển dụng',
          'Chưa biết định hướng nghề nghiệp',
        ],
      },
      {
        id: 'q_support',
        short: 'Mức cần hỗ trợ từ trường',
        label: 'Bạn cần nhà trường hỗ trợ kết nối việc làm ở mức nào?',
        type: 'scale',
        minLabel: 'Không cần',
        maxLabel: 'Rất cần',
      },
      {
        id: 'q_other',
        short: 'Ý kiến khác',
        label: 'Ý kiến / mong muốn khác',
        type: 'text',
      },
    ],
  },
  {
    id: 'internship-v1',
    title: 'Nhu cầu thực tập doanh nghiệp',
    questions: [
      {
        id: 'i_need',
        short: 'Nhu cầu thực tập',
        label: 'Bạn có nhu cầu thực tập tại doanh nghiệp không?',
        type: 'single',
        required: true,
        options: ['Có, đã tìm được nơi thực tập', 'Có, chưa tìm được', 'Chưa có nhu cầu'],
      },
      {
        id: 'i_duration',
        short: 'Thời gian thực tập',
        label: 'Thời gian thực tập phù hợp?',
        type: 'single',
        options: ['Dưới 2 tháng', '2 – 3 tháng', '4 – 6 tháng', 'Trên 6 tháng'],
      },
      {
        id: 'i_expect',
        short: 'Mong đợi khi thực tập',
        label: 'Bạn mong đợi gì nhất ở kỳ thực tập?',
        type: 'multi',
        options: [
          'Học kỹ năng chuyên môn',
          'Có phụ cấp',
          'Cơ hội được nhận việc chính thức',
          'Có người hướng dẫn tận tình',
          'Làm dự án thực tế',
        ],
      },
      {
        id: 'i_support',
        short: 'Mức cần hỗ trợ tìm nơi thực tập',
        label: 'Bạn cần nhà trường hỗ trợ tìm nơi thực tập ở mức nào?',
        type: 'scale',
        minLabel: 'Không cần',
        maxLabel: 'Rất cần',
      },
      {
        id: 'i_other',
        short: 'Ý kiến khác (thực tập)',
        label: 'Ý kiến / mong muốn khác',
        type: 'text',
      },
    ],
  },
];

export const YEAR_OPTIONS = ['Năm 1', 'Năm 2', 'Năm 3', 'Năm 4', 'Năm 5 trở lên', 'Đã tốt nghiệp'];

export function findQuestionSet(id) {
  return QUESTION_SETS.find((s) => s.id === id) || null;
}
