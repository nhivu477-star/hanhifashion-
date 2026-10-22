export type ContentEntry = {
  title: string;
  intro: string;
  sections: [string, string][];
};
export const policyLinks = [
  ["huong-dan-mua-hang", "Hướng dẫn mua hàng"],
  ["thanh-toan-va-xac-nhan", "Thanh toán & xác nhận đơn"],
  ["chinh-sach-giao-hang", "Giao hàng"],
  ["chinh-sach-doi-tra", "Đổi trả & hoàn tiền"],
  ["chinh-sach-bao-mat", "Bảo mật thông tin"],
  ["dieu-khoan-su-dung", "Điều khoản sử dụng"],
] as const;
export const content: Record<string, ContentEntry> = {
  "huong-dan-mua-hang": {
    title: "Hướng dẫn mua hàng",
    intro:
      "Một trải nghiệm mua sắm rõ ràng, từ lựa chọn đầu tiên đến khi nàng nhận được thiết kế phù hợp.",
    sections: [
      [
        "Lựa chọn thiết kế",
        "Khám phá trang phục, giày, túi và phụ kiện theo danh mục. Mỗi trang sản phẩm có ảnh từng màu, mô tả và kích cỡ được cung cấp từ nguồn tham khảo. Màu sắc trên màn hình có thể chênh lệch nhẹ do ánh sáng và thiết bị hiển thị.",
      ],
      [
        "Tư vấn trước khi đặt hàng",
        "Kiểm tra đúng màu và kích cỡ trước khi thêm vào túi mua sắm. Nếu chưa chắc về phom dáng, số đo hoặc cỡ giày, nàng có thể nhắn trực tiếp để được hỗ trợ. Không dùng bảng cỡ trang phục để suy ra cỡ giày hoặc phụ kiện.",
      ],
      [
        "Kiểm tra túi mua sắm",
        "Đối chiếu tên sản phẩm, màu, kích cỡ, số lượng và giá trị đơn. Phí giao hàng và ưu đãi hợp lệ được thể hiện riêng trong phần tổng kết trước khi hoàn tất. Với sản phẩm hiển thị “Liên hệ”, vui lòng trao đổi để xác nhận thông tin thay vì đặt mua ở mức giá chưa được công bố.",
      ],
      [
        "Thông tin người nhận",
        "Cung cấp họ tên, số điện thoại có thể liên lạc và địa chỉ đầy đủ. Kiểm tra lại phường/xã, tỉnh/thành phố, số nhà và thông tin cần lưu ý khi giao nhận. Chỉ cung cấp những dữ liệu cần thiết để xử lý yêu cầu của nàng.",
      ],
      [
        "Xác nhận và theo dõi",
        "Mã đơn giúp nàng tra cứu yêu cầu đã gửi. Việc tiếp nhận yêu cầu không đồng nghĩa đơn hàng đã được xác nhận cung ứng. Khi vận hành bán hàng chính thức, HÀ NHI sẽ xác nhận tình trạng sản phẩm, tổng chi phí và phương án giao nhận trước khi thực hiện đơn.",
      ],
      [
        "Trải nghiệm hiện tại",
        "Website hiện là bản trải nghiệm. Thao tác đặt hàng chỉ tạo đơn, chưa thu tiền, chưa gửi hàng và chưa kết nối đơn vị vận chuyển. Nàng nên dùng thông tin và không nhập dữ liệu thẻ ngân hàng.",
      ],
    ],
  },
  "gioi-thieu": {
    title: "Thời trang nữ, giày, túi xách & phụ kiện",
    intro:
      "HÀ NHI FASHION giới thiệu trang phục nữ, giày, túi xách và phụ kiện để nàng lựa chọn và kết hợp theo phong cách riêng.",
    sections: [
      [
        "Trang phục nữ cho nhiều phong cách",
        "Khám phá áo, đầm, quần, chân váy và bộ trang phục với màu sắc, kích cỡ phù hợp với nàng.",
      ],
      [
        "Giày, túi xách và phụ kiện phối cùng",
        "Kết hợp trang phục với giày, túi xách và phụ kiện để hoàn thiện phong cách. Website hiện là bản trải nghiệm; hình ảnh và danh mục tham khảo chưa phải cam kết về hàng hóa thực tế.",
      ],
    ],
  },
  "thanh-toan-va-xac-nhan": {
    title: "Thanh toán & xác nhận đơn",
    intro:
      "Thông tin chi phí và trạng thái đơn hàng cần được rõ ràng trước mọi quyết định mua sắm.",
    sections: [
      [
        "Giá và tổng giá trị đơn",
        "Giá gốc và thanh toán bằng đồng Việt Nam (VND). Giá quy đổi theo tiền tệ đã chọn chỉ để tham khảo. Tổng kết đơn tách riêng tiền sản phẩm, ưu đãi và phí giao hàng. Không tự phát sinh khoản phụ thu ngoài thông tin đã được khách hàng xác nhận. Nếu có sai lệch rõ ràng về giá hoặc tình trạng sản phẩm, cửa hàng cần thông báo và trao đổi phương án trước khi xử lý đơn.",
      ],
      [
        "Phương thức thanh toán",
        "Bản trải nghiệm hiện chỉ lựa chọn thanh toán khi nhận hàng (COD), không thực hiện thu tiền. Chưa có cổng thanh toán trực tuyến hoặc tài khoản ngân hàng nhận tiền được công bố trên website. Không chuyển khoản chỉ dựa vào thông tin từ tài khoản lạ hoặc tin nhắn không xác minh.",
      ],
      [
        "Khi nào đơn hàng được xác nhận",
        "Trong giai đoạn bán hàng chính thức, đơn chỉ được thực hiện sau khi cửa hàng xác nhận có thể cung ứng đúng thiết kế, màu, kích cỡ, giá và phương án giao nhận. Nếu một phần đơn không còn hàng, khách hàng được lựa chọn điều chỉnh hoặc hủy phần đó; không tự ý thay sản phẩm khác.",
      ],
      [
        "Thay đổi hoặc hủy yêu cầu",
        "Liên hệ cửa hàng kèm mã đơn càng sớm càng tốt nếu cần đổi thông tin hoặc hủy. Yêu cầu trước khi bàn giao vận chuyển được kiểm tra theo trạng thái thực tế. Nếu kiện hàng đã được gửi, phương án xử lý và chi phí liên quan cần được thông báo trước để khách hàng quyết định.",
      ],
      [
        "Hoàn tiền",
        "Khoản hoàn tiền được đối chiếu với số tiền thực tế đã thanh toán cho phần hàng được chấp thuận hoàn. Bản trải nghiệm không thu tiền nên không phát sinh giao dịch hoàn tiền thật. Quy trình đổi trả và cách tính chi phí được trình bày tại chính sách đổi trả & hoàn tiền.",
      ],
    ],
  },
  "chinh-sach-giao-hang": {
    title: "Chính sách giao hàng",
    intro:
      "Ưu tiên sự chỉn chu trong từng lần bàn giao, thông tin rõ ràng và hỗ trợ xuyên suốt quá trình nhận hàng.",
    sections: [
      [
        "Phạm vi và xác nhận giao nhận",
        "Phương án phục vụ dự kiến là giao hàng trong Việt Nam, tùy khả năng của đơn vị vận chuyển tại địa chỉ nhận. Đơn ngoài phạm vi phục vụ hoặc cần giao quốc tế phải được trao đổi riêng trước khi xác nhận. Website hiện chưa thực hiện giao hàng thực tế.",
      ],
      [
        "Chuẩn bị và đóng gói",
        "Khi mở bán chính thức, sản phẩm cần được đối chiếu đúng mã, màu, kích cỡ và số lượng trước khi đóng gói. Với giày, túi hoặc phụ kiện, bao bì và lớp bảo vệ cần phù hợp với đặc tính sản phẩm. Các yêu cầu đóng gói đặc biệt cần được thống nhất trước khi xử lý đơn.",
      ],
      [
        "Thời gian dự kiến",
        "Thời gian chuẩn bị hàng và thời gian vận chuyển là hai giai đoạn riêng. Cửa hàng sẽ xác nhận mốc giao dự kiến theo tình trạng hàng và địa chỉ cụ thể; không mặc định mọi sản phẩm đều có thể giao ngay. Đơn đặt trước, ngày lễ hoặc khu vực khó tiếp cận cần được thông báo lịch riêng. Nếu có chậm trễ đáng kể, khách hàng được cập nhật và trao đổi phương án tiếp tục hoặc hủy phù hợp.",
      ],
      [
        "Chi phí vận chuyển",
        "Chi phí được thể hiện trong tổng kết đơn trước khi đặt hàng. Bản trải nghiệm đang tính mức tiêu chuẩn 30.000đ; ưu đãi nếu đủ điều kiện sẽ tự phản ánh tại đây. Những yêu cầu giao gấp, giao lại hoặc dịch vụ đặc biệt chỉ được thực hiện sau khi khách hàng đồng ý với chi phí cụ thể.",
      ],
      [
        "Khi nhận kiện hàng",
        "Vui lòng đối chiếu tên người gửi, thông tin người nhận và tình trạng bao bì. Nếu kiện bị mở, rách hoặc có dấu hiệu bất thường, hãy ghi nhận với người giao và liên hệ cửa hàng để được hướng dẫn. Nàng có thể chụp ảnh hoặc quay video để hỗ trợ đối chiếu; việc không có video không tự động làm mất quyền phản ánh hoặc yêu cầu xử lý.",
      ],
      [
        "Giao không thành công hoặc thất lạc",
        "Nếu cần sửa địa chỉ hoặc đổi lịch nhận, hãy liên hệ sớm cùng mã đơn. Với kiện chậm, thất lạc hoặc hư hỏng trong vận chuyển, cửa hàng là đầu mối phối hợp xác minh và trao đổi phương án với khách hàng; không yêu cầu khách tự giải quyết toàn bộ với đơn vị giao hàng.",
      ],
    ],
  },
  "chinh-sach-doi-tra": {
    title: "Đổi trả & hoàn tiền",
    intro:
      "Hỗ trợ đổi trả trong 03 ngày khi sản phẩm có lỗi, với quy trình tiếp nhận rõ ràng và kiểm tra minh bạch.",
    sections: [
      [
        "Thời hạn gửi yêu cầu",
        "Vui lòng gửi yêu cầu trong vòng 03 ngày (đủ 72 giờ từ thời điểm nhận hàng) nếu phát hiện sản phẩm có lỗi. Cung cấp mã đơn, tên sản phẩm và mô tả tình trạng để cửa hàng đối chiếu. Thời hạn này là thời hạn tiếp nhận theo chính sách hỗ trợ của cửa hàng, không loại trừ các quyền khách hàng được pháp luật bảo vệ trong trường hợp có căn cứ khác.",
      ],
      [
        "Trường hợp được hỗ trợ",
        "Tiếp nhận khi sản phẩm có lỗi được xác nhận từ khâu sản xuất hoặc chuẩn bị hàng, chẳng hạn lỗi đường may, rách vải, chi tiết hư hỏng hoặc lỗi hoàn thiện ảnh hưởng đến việc sử dụng. Tình trạng thực tế, thông tin khi giao nhận và đặc điểm thiết kế được đối chiếu trước khi thống nhất phương án. Cửa hàng không áp dụng đổi size, đổi màu hoặc đổi mẫu chỉ vì thay đổi nhu cầu cá nhân.",
      ],
      [
        "Tình trạng sản phẩm gửi kiểm tra",
        "Giữ nguyên tình trạng phát hiện lỗi; không giặt, sử dụng tiếp, tự sửa hoặc làm thay đổi vị trí cần kiểm tra. Giữ nhãn mác, phụ kiện và bao bì nếu còn. Những dấu hiệu bẩn, mùi hoặc hư hỏng phát sinh do sử dụng, bảo quản sai hướng dẫn cần được kiểm tra nguyên nhân và không mặc nhiên được coi là lỗi của sản phẩm. Không dùng việc thiếu bao bì hoặc nhãn mác để tự động bác bỏ một yêu cầu có căn cứ về lỗi.",
      ],
      [
        "Cách gửi yêu cầu",
        "Liên hệ qua kênh nhắn tin chính thức, email hoặc trang Liên hệ, kèm mã đơn, ngày nhận, mô tả lỗi và ảnh thể hiện tình trạng nếu có. Video mở kiện có thể giúp đối chiếu nhưng không phải bằng chứng bắt buộc duy nhất. Sau khi kiểm tra thông tin, cửa hàng cung cấp hướng dẫn và địa chỉ nhận lại; vui lòng không tự gửi đến địa chỉ chưa được xác nhận.",
      ],
      [
        "Phương án xử lý và chi phí",
        "Khi xác nhận sản phẩm có lỗi thuộc trách nhiệm cửa hàng, hai bên thống nhất đổi sản phẩm phù hợp hoặc hoàn tiền. Nếu không có sản phẩm thay thế đáp ứng yêu cầu đã xác nhận, cửa hàng trao đổi phương án hoàn tiền thay vì tự ý đổi mẫu khác. Cửa hàng chịu chi phí vận chuyển hợp lý cho việc gửi lại và khắc phục lỗi đã được xác nhận; mọi chi phí khác cần được thông báo trước.",
      ],
      [
        "Hoàn tiền",
        "Số tiền hoàn được đối chiếu với khoản khách đã thanh toán thực tế cho phần hàng được chấp thuận hoàn, cùng chi phí liên quan thuộc trách nhiệm cửa hàng nếu có. Phương thức và thời điểm dự kiến được xác nhận để khách hàng theo dõi. Không tự động thay khoản hoàn bằng phiếu mua hàng khi khách chưa đồng ý. Không yêu cầu mật khẩu, mã OTP hoặc mã bảo mật thẻ để hoàn tiền.",
      ],
      [
        "Giao sai, thiếu hàng hoặc kiện bị hư hỏng",
        "Nếu nhận sai mẫu, sai màu/kích cỡ đã đặt, thiếu sản phẩm hoặc kiện bị hư hỏng trong vận chuyển, hãy liên hệ ngay khi phát hiện. Cửa hàng đối chiếu và phối hợp bổ sung, thay thế hoặc hoàn tiền phù hợp; đây không phải yêu cầu đổi do thay đổi nhu cầu cá nhân. Các quyền liên quan đến giao sai hoặc hàng hóa không đúng nội dung đã xác nhận vẫn được xem xét theo quy định áp dụng.",
      ],
      [
        "Phạm vi áp dụng hiện tại",
        "Chính sách 03 ngày khi sản phẩm có lỗi được chuẩn bị cho giai đoạn bán hàng chính thức. Website hiện là bản trải nghiệm, chưa thu tiền hoặc giao hàng, nên chưa phát sinh đổi trả hoặc hoàn tiền thực tế.",
      ],
    ],
  },
  "chinh-sach-bao-mat": {
    title: "Chính sách bảo mật",
    intro:
      "Tôn trọng quyền riêng tư, sử dụng thông tin đúng mục đích và minh bạch về cách nàng kiểm soát dữ liệu của mình.",
    sections: [
      [
        "Phạm vi và đầu mối liên hệ",
        "Chính sách mô tả việc xử lý thông tin khi nàng dùng website HÀ NHI FASHION hiện tại. Website đang ở giai đoạn trải nghiệm, chưa kết nối hoạt động giao hàng hoặc thu tiền thực tế. Với yêu cầu liên quan đến dữ liệu cá nhân, vui lòng dùng mục Liên hệ hoặc email hanhifashion@gmail.com; không gửi mật khẩu, mã OTP hay thông tin thẻ.",
      ],
      [
        "Thông tin được thu thập",
        "Tùy tính năng nàng chủ động sử dụng, website có thể lưu họ tên, email, số điện thoại, địa chỉ, tài khoản, nội dung liên hệ, thiết kế yêu thích và lịch sử đơn. Mật khẩu được lưu dưới dạng băm. Website sử dụng thông tin phiên, giỏ hàng và một số dấu hiệu kỹ thuật của yêu cầu truy cập để vận hành và hạn chế lạm dụng; không yêu cầu thông tin thẻ ngân hàng.",
      ],
      [
        "Mục đích sử dụng",
        "Thông tin được dùng để duy trì tài khoản, ghi nhớ lựa chọn, xử lý yêu cầu mua sắm hoặc hỗ trợ và bảo vệ hoạt động website. Đăng ký nhận tin là lựa chọn riêng, không phải điều kiện để xem sản phẩm. Danh sách email hiện chỉ được lưu cho tính năng, chưa gửi chiến dịch tiếp thị tự động. Không dùng việc duyệt website như một sự đồng ý bao quát cho mọi mục đích xử lý.",
      ],
      [
        "Cookie và dữ liệu trên thiết bị",
        "Cookie cần thiết giúp duy trì đăng nhập và giỏ hàng. Phiên đăng nhập có thời hạn tối đa 7 ngày; cookie giỏ hàng của khách có thời hạn tối đa 30 ngày. Lựa chọn yêu thích của khách có thể được lưu trên trình duyệt. Xóa hoặc chặn dữ liệu trình duyệt có thể làm mất lựa chọn đang lưu hoặc yêu cầu đăng nhập lại. Bản hiện tại không tích hợp công cụ theo dõi quảng cáo hoặc phân tích của bên thứ ba.",
      ],
      [
        "Truy cập và chia sẻ thông tin",
        "Trong bản trải nghiệm, dữ liệu được lưu tại môi trường chạy website; nhân sự có tài khoản quản trị được cấp quyền có thể tiếp cận thông tin cần cho việc hỗ trợ và quản lý. Chưa chuyển thông tin đơn hàng sang đơn vị vận chuyển, cổng thanh toán hoặc nhà cung cấp email. Khi bổ sung đối tác phục vụ giao dịch thật, phạm vi dữ liệu, mục đích và cơ chế bảo vệ cần được cập nhật và thông báo phù hợp trước khi sử dụng.",
      ],
      [
        "Thời gian lưu trữ",
        "Dữ liệu được giữ trong phạm vi cần để phục vụ tính năng, giải quyết yêu cầu và đối chiếu vấn đề phát sinh; không coi việc tạo tài khoản là sự chấp thuận lưu mọi dữ liệu vô thời hạn. Có thể yêu cầu rà soát và xóa thông tin qua đầu mối liên hệ. Trường hợp có nghĩa vụ lưu trữ theo luật khi vận hành thương mại, cửa hàng cần giải thích phạm vi và căn cứ áp dụng.",
      ],
      [
        "Lựa chọn và quyền của nàng",
        "Nàng có thể yêu cầu được biết, truy cập, chỉnh sửa thông tin, rút lại sự đồng ý khi phù hợp, hạn chế hoặc yêu cầu xóa dữ liệu theo điều kiện pháp luật. Website hiện chưa có công cụ tự xuất hoặc tự xóa toàn bộ dữ liệu, nên các yêu cầu này được tiếp nhận thủ công qua liên hệ. Cửa hàng có thể cần xác minh ở mức cần thiết để bảo vệ tài khoản, không yêu cầu cung cấp mật khẩu. Việc hạn chế dữ liệu cần thiết có thể ảnh hưởng khả năng cung cấp tính năng tương ứng.",
      ],
      [
        "Bảo vệ tài khoản và phản ánh sự cố",
        "Giữ riêng mật khẩu, đăng xuất trên thiết bị dùng chung và báo ngay khi nghi ngờ tài khoản bị truy cập trái phép. Không có biện pháp kỹ thuật nào bảo đảm tuyệt đối; khi phát hiện sự cố liên quan đến thông tin cá nhân, đầu mối quản lý cần xác minh, hạn chế ảnh hưởng và thông tin theo yêu cầu áp dụng. Nàng có thể gửi phản ánh qua email hoặc trang Liên hệ.",
      ],
      [
        "Liên kết ngoài và cập nhật",
        "Các liên kết sang mạng xã hội hoặc trang nguồn ảnh đưa nàng đến dịch vụ có chính sách riêng. Vui lòng kiểm tra địa chỉ và chính sách của dịch vụ đó trước khi cung cấp thông tin. Khi chính sách này thay đổi, phiên bản và ngày cập nhật được thể hiện tại đây; nội dung mới không tự động hợp thức hóa việc dùng dữ liệu đã thu thập cho mục đích không phù hợp.",
      ],
    ],
  },
  "dieu-khoan-su-dung": {
    title: "Điều khoản sử dụng",
    intro:
      "Những nguyên tắc giúp trải nghiệm tại HÀ NHI FASHION được rõ ràng, tôn trọng và đáng tin cậy.",
    sections: [
      [
        "Phạm vi sử dụng website",
        "Website cung cấp thông tin về thời trang nữ, giày, túi, phụ kiện và các tính năng hỗ trợ mua sắm. Bản hiện tại là môi trường trải nghiệm, chưa mở bán hoặc thực hiện giao dịch thu tiền và giao hàng thật. Các điều kiện mua bán là phương án đề xuất; thông tin đơn không tạo cam kết cung ứng hàng hóa thực tế.",
      ],
      [
        "Thông tin sản phẩm",
        "Hình ảnh, tên thiết kế, màu sắc, giá và thông tin nguồn trong bản trải nghiệm được dùng để trình bày và kiểm tra danh mục. Một số ảnh tham khảo thuộc bên thứ ba; việc xuất hiện trên website không đồng nghĩa HÀ NHI sở hữu thiết kế, là đại lý được ủy quyền hoặc được người mẫu bảo trợ. Khi vận hành thương mại, nguồn gốc hàng hóa, quyền sử dụng tài nguyên và thông tin sản phẩm cần được xác nhận trước khi mở bán.",
      ],
      [
        "Tài khoản và cách sử dụng",
        "Cung cấp thông tin phù hợp, giữ kín thông tin đăng nhập và không sử dụng tài khoản của người khác khi chưa được phép. Không dùng website để phát tán nội dung trái pháp luật, gây gián đoạn hoạt động hoặc truy cập dữ liệu ngoài quyền được cấp. Nếu phát hiện sự cố, vui lòng liên hệ để được kiểm tra; không tự khai thác hoặc công bố dữ liệu cá nhân của người khác.",
      ],
      [
        "Đặt hàng và xác nhận",
        "Màu, kích cỡ, số lượng và tổng chi phí cần được kiểm tra trước khi gửi yêu cầu. Trong hoạt động bán hàng chính thức, tiếp nhận một yêu cầu chưa đồng nghĩa cửa hàng đã xác nhận có thể cung ứng. Nếu có sai sót về giá, thông tin hoặc tình trạng hàng, cần trao đổi để khách hàng lựa chọn phương án phù hợp; không tự áp dụng điều kiện bất lợi mới cho đơn đã được chấp thuận.",
      ],
      [
        "Thanh toán, giao hàng và đổi trả",
        "Các thông tin chi tiết được trình bày tại những chính sách tương ứng và cần được đọc cùng điều khoản này. Phí được công bố trước khi khách hàng xác nhận; thay đổi phát sinh phải được trao đổi. Không dùng điều khoản của website để loại bỏ quyền khiếu nại, yêu cầu khắc phục hoặc những quyền bắt buộc khác của khách hàng.",
      ],
      [
        "Hình ảnh và nội dung",
        "Không tự nhận quyền sở hữu đối với tài nguyên không thuộc mình hoặc tái sử dụng thương mại khi chưa có căn cứ cho phép. Logo HÀ NHI và thông tin liên hệ chính thức được dùng để nhận diện website. Nội dung hoặc đường dẫn của bên thứ ba không phải cam kết về chất lượng, giá hoặc điều kiện của dịch vụ đó.",
      ],
      [
        "Tiếp nhận phản ánh và giải quyết bất đồng",
        "Gửi mã đơn nếu có, nội dung yêu cầu và chứng cứ phù hợp qua kênh liên hệ chính thức. HÀ NHI tiếp nhận và trao đổi trên tinh thần thiện chí, căn cứ thông tin có thể đối chiếu. Khách hàng vẫn có quyền đề nghị hỗ trợ từ cơ quan, tổ chức có thẩm quyền hoặc lựa chọn phương thức giải quyết theo pháp luật Việt Nam.",
      ],
      [
        "Thay đổi điều khoản",
        "Ngày cập nhật được ghi rõ trên trang. Những thay đổi quan trọng cần được thông báo phù hợp và không tự động áp dụng hồi tố theo hướng bất lợi cho giao dịch đã xác lập. Nếu một nội dung không thể áp dụng theo luật, quyền lợi bắt buộc theo pháp luật vẫn được tôn trọng.",
      ],
    ],
  },
};
